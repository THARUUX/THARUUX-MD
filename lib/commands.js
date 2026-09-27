const config = require('../config');

const commands = [];

function pnix(cmd, func) {
  const commandObj = {
    ...cmd,
    function: func
  };
  if (cmd.command) {
    const existingIndex = commands.findIndex(
      (c) => c.command && c.command.toLowerCase() === cmd.command.toLowerCase()
    );
    if (existingIndex !== -1) {
      commands[existingIndex] = commandObj; // Update with latest command definition
      return cmd;
    }
  }
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
