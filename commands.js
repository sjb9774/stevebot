class BotCommand {
    constructor(executeFunction) {
        this.executeFunction = executeFunction;
    }

    execute(command, ...rest) {
        return this.executeFunction(...rest);
    }
}


var currentMessage = {
    channel: null,
    target: null,
    user: null,
    rawMessage: null
}


class CommandManager {

    constructor() {
        this.commands = [];
        this.resultHandler = (x) => x;
    }

    register(command, identifier, tags=[]) {
        this.commands.push({
           command: command,
           identifier: identifier,
           tags: tags
        });
        return true;
    }

    unregister(tag) {
        const matchingIndex = this.commands.reduce((commandData, currentValue, index) => {
            if (currentValue !== -1) {
                return currentValue;
            }
            if (commandData.tags.indexOf(tag) !== -1) {
                return index;
            }
            return -1;
        }, -1);

        if (matchingIndex !== -1) {
            this.commands.splice(matchingIndex, 1);
            return true;
        }
        return false;
    }

    setResultHandler(handler) {
        this.resultHandler = handler;
    }

    dispatch(commandMessage) {
        this.commands.forEach((commandData) => {
            if (this.identify(commandMessage, commandData)) {
                const args = this.parseArgs(commandMessage);
                const result = commandData.command.execute(...args);
                this.resultHandler(result, commandMessage, commandData);
            }
        });
    }

    identify(commandMessage, commandData) {
        if (typeof commandData.identifier === "function") {
            return commandData.identifier(commandMessage);
        }
        return commandMessage.startsWith(commandData.identifier);
    }

    parseArgs(message) {
        return message.split(' ');
    }

    messageMatchesAnyCommand(message) {
        return this.commands.reduce((commandData, currentValue) => {
            return this.identify(message, commandData) || currentValue;
        }, false);
    }

    consume(message) {
        return this.dispatch(message);
    }

    onMessage(target, context, msg, self) {
        if (self) {
            return;
        }
        currentMessage = context;
        // add this to the normal context object and alias for intuitive use
        currentMessage.target = target;
        currentMessage.channel = target;
        try {
            this.consume(msg);
        } catch (err) {
            console.log(err);
        }
    }
}

const messageContext = () => {
    // see onMessage method for where this populated
    return currentMessage;
}

COMMAND_PERMISSIONS = {
    BROADCASTER: () => {
        const ctx = messageContext();
        return `#${ctx.username.toLowerCase()}` === `${ctx.channel.toLowerCase()}`;
    },
    MOD: () => {
        return COMMAND_PERMISSIONS.NON_BROADCASTER_MOD() || COMMAND_PERMISSIONS.BROADCASTER();
    },
    NON_BROADCASTER_MOD: () => {
        const ctx = messageContext();
        return ctx["user-type"] === "mod";
    },
    ALL: () => {
        return true;
    },
    NONE: () => {
        return false;
    }
}

manager = new CommandManager();
module.exports = {
    manager: manager,
    createCommand: (executeFunction, invoker, tags=[]) => {
        const cmd = new BotCommand(executeFunction);
        return manager.register(cmd, invoker, tags);
    },
    getCurrentMessageContext: messageContext,
    permissions: COMMAND_PERMISSIONS
}
