const stackery = require('stackery');
const child_process = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const glob = require('glob');

function spawnPromise(command, options) {
  options = options || {};

  if (!options.env) {
    options.env = {};
  }

  Object.assign(options.env, process.env);

  return new Promise((resolve, reject) => {
    child_process.exec(command, options, (err, stdout, stderr) => {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;

        reject(err);
      } else {
        resolve({ stdout: stdout, stderr: stderr });
      }
    });
  });
}

module.exports = function(message) {
  let body;

  try {
    body = JSON.parse(message.body.toString());
  } catch (err) {
    throw new Error(
      `Failed to parse message body:\n${message.body.toString()}`
    );
  }

  if (
    body.action !== 'opened' &&
    body.action !== 'edited' &&
    body.action !== 'reopened' &&
    body.action !== 'synchronize'
  ) {
    console.log(`PR was ${body.action} and will not trigger a new build`);
    return Promise.resolve();
  }

  const token = '<MODIFY: github access token>';
  const prNumber = body.pull_request.number;
  const branch = body.pull_request.head.ref;
  const repo = body.pull_request.head.repo.full_name;
  const localRepoDir = '/tmp/repo';
  const cdnUrl = `https://<MODIFY: link to CDN node domain>/${prNumber}/index.html`;
  const postUrl = `https://api.github.com/repos/<MODIFY: repo owner>/<MODIFY: repo name>/issues/${prNumber}/comments`;

  fs.emptyDirSync(localRepoDir);

  return spawnPromise(`./run.sh 'https://${token}@github.com/${repo}.git' '${branch}' '${prNumber}' '${localRepoDir}'`)
    .then(() => {
      let files = glob.sync('**/*', {
        cwd: `${localRepoDir}/build`,
        nodir: true,
        dot: true
      });

      const promises = files.map(file => {
        const patternHtml = /\.html$/i;
        const patternJs = /.*\.js$/;
        const patternCss = /.*\.css$/i;
        const patternSvg = /.*\.svg$/i;
        const metadata = {};

        if (patternHtml.test(file)) {
          metadata['Content-Type'] = 'text/html';
          metadata['Cache-Control'] = 'no-cache';
        } else if (patternCss.test(file)) {
          metadata['Content-Type'] = 'text/css';
        } else if (patternJs.test(file)) {
          metadata['Content-Type'] = 'application/javascript';
        } else if (patternSvg.test(file)) {
          metadata['Content-Type'] = 'image/svg+xml';
        }

        return stackery.output({
          action: 'put',
          key: `${prNumber}/${file}`,
          publicPermissions: 'read',
          body: fs.readFileSync(`${localRepoDir}/build/${file}`),
          metadata: metadata
        });
      });

      return Promise.all(promises);
    })
    .then(message => {
      if (body.action === 'opened') {
        return spawnPromise(`./update.sh '${token}' '${cdnUrl}' '${postUrl}'`);
      }
    })
    .catch(err => {
      console.log('error', err);
    });
};
