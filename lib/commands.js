const config = require('../config');

const commands = [];

function pnix(cmd, func) {
  const commandObj = {
    ...cmd,
    function: func
  };
  commands.push(commandObj);
  return cmd;
}

module.exports = {
  pnix,
  commands,
  get mode() {
    return (config.MODE || 'public').toLowerCase() !== 'public';
  }
};
