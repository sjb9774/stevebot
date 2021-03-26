const commands = require(`./commands.js`);
const dir = `${require.main.path}`;

const fs = require('fs');
const setupFileExists = fs.existsSync(`${dir}/command-setup.js`);

var preSetupHook = (x) => x;
var globalPermission = (next, ...rest) => next()
if (setupFileExists) {
    const customSetup = require(`${dir}/command-setup.js`);
    preSetupHook = customSetup.commandPreSetupHook || preSetupHook;
    globalPermission = customSetup.defaultPermissions || globalPermission;
}

function getFinalCommandList() {
    return preSetupHook(fs.readdirSync(`${dir}/commands/`));
}

var exports = {
    setup: setup,
    getCurrentMessageContext: commands.getCurrentMessageContext,
    commands: commands,
    getFinalCommandModules: () => getFinalCommandList().map((filename) => require(`${dir}/commands/${filename}`))
};
module.exports = exports;

function setup() {
    const finalCommandFiles = getFinalCommandList();
    
    // every file in the "commands" folder can be automatically converted into a bot command as long as it exposes the three props
    // executeFunction: Function to run when the command is called
    // invoker: String or function that determines whether a message is the command in question. If a string, just a simple strict match to the first element of the message
    // permission: optional, a callable that takes the same args as the executeFunction and returns a bool indicating whether a command should be executed based on separate criteria from the invoker
    // tags: optional, arbitrary descriptive tags used for simple command disabling
    finalCommandFiles.forEach((file) => {
        const cmd = require(`${dir}/commands/${file}`);
        const defaultResolver = (...x) => x;
        const argResolver = cmd.argResolver || defaultResolver;
        const wrappedExecute = (...args) => {
            const permFunction = () => (cmd.permission || commands.permissions.ALL)(...args);
            args = argResolver(...args);
            const isPermitted = globalPermission(permFunction, ...args);
            if (isPermitted) {
                let result = cmd.executeFunction(...args);
                return result;
            }
            return "You do not have permission to execute this command";
        }
        commands.createCommand(wrappedExecute, cmd.invoker, cmd.tags);

    });
    exports.manager = commands.manager;
    return commands.manager;
}
setup();