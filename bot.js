const {permissions, CommandManager, CommonCommandHandler} = require(`./commands.js`);
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

class Bot {

    constructor({commandsDir=null, globalPermission=null, commandPreSetupHook=null, say=null, listen=null}) {
        this.commandsDir = commandsDir || `${dir}/commands/`;
        this.globalPermission = globalPermission;
        this.commandPreSetupHook = commandPreSetupHook;
        this.say = say;
        this.listen = listen;
        this.setup();
    }

    getFinalCommandList() {
        return this.commandPreSetupHook(fs.readdirSync(`${this.commandsDir}`));
    }

    getManager() {
        return this.manager;
    }
    
    getCurrentMessageContext() {
        return this.getManager().getCurrentMessageContext()
    }

    setup() {
        this.manager = new CommandManager(this.say, this.listen);
        this.handler = new CommonCommandHandler();
        this.manager.registerHandler(this.handler.dispatch.bind(this.handler));

        const finalCommandFiles = this.getFinalCommandList();
    
        // every file in the "commands" folder can be automatically converted into a bot command as long as it exposes the three props
        // executeFunction: Function to run when the command is called
        // invoker: String or function that determines whether a message is the command in question. If a string, just a simple strict match to the first element of the message
        // permission: optional, a callable that takes the same args as the executeFunction and returns a bool indicating whether a command should be executed based on separate criteria from the invoker
        // tags: optional, arbitrary descriptive tags used for simple command disabling
        finalCommandFiles.forEach((file) => {
            const cmd = require(`${this.commandsDir}${file}`);
            const defaultResolver = ({args}) => args.slice(1);
            const argResolver = cmd.argResolver || defaultResolver;
            const wrappedExecute = (...args) => {
                const permFunction = () => (cmd.permission || permissions.ALL)(...args);
                const contextObj = args[args.length - 1]
                let rest = args.slice(0, -1)
                rest = argResolver({args: rest, ...contextObj});
                const isPermitted = this.globalPermission(permFunction, ...args);
                if (isPermitted) {
                    let result = cmd.executeFunction(...rest, contextObj);
                    return result;
                }
                return "You do not have permission to execute this command";
            }
            this.handler.createCommand(wrappedExecute, cmd.invoker, cmd.tags);
        });
    }

}

class SimpleBot extends Bot {
    constructor({commandsDir=null, globalPermission=null, commandPreSetupHook=null}) {
        super(commandsDir, globalPermission, commandPreSetupHook);
        this.client = null;
    }

    login(username, password, channel) {

    }

    say(message) {

    }

    listen(onMessage) {

    }
}

var exports = {
    getFinalCommandModules: () => getFinalCommandList().map((filename) => require(`${dir}/commands/${filename}`)),
    Bot: Bot,
    permissions: permissions
};
module.exports = exports;
