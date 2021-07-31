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
        this.handlers = [];
        this.resultHandler = (x) => x;
    }

    registerHandler(handler) {
        this.handlers.push(handler);
    }


    setResultHandler(handler) {
        this.resultHandler = handler;
    }

    dispatch(commandMessage) {
        this.handlers.forEach((handler) => {
            const result = handler(commandMessage, this.resultHandler.bind(this));
            this.resultHandler(result, commandMessage, handler);
        })
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

class CommonCommandHandler {

    constructor() {
        this.commands = [];
        this.resultHandler = (x) => x;
    }

    add(execute, identifier, tags=[]) {
        const cmd = new BotCommand(execute);
        this.commands.push({
            command: cmd,
            identifier: identifier,
            tags: tags
         });
         return true;
    }
    
    parseArgs(message) {
        return message.split(' ');
    }

    identify(commandMessage, commandData) {
        if (typeof commandData.identifier === "function") {
            return commandData.identifier(commandMessage);
        }
        return commandMessage.startsWith(commandData.identifier);
    }

    dispatch(commandMessage, resultHandler) {
        this.commands.forEach((commandData) => {
            if (this.identify(commandMessage, commandData)) {
                const args = this.parseArgs(commandMessage);
                const result = commandData.command.execute(...args);
                resultHandler(result, commandMessage, commandData);
            }
        });
    }

    createCommand(executeFunction, invoker, tags=[]) {
        return this.add(executeFunction, invoker, tags);
    }
}

module.exports = {
    CommandManager,
    CommonCommandHandler,
    getCurrentMessageContext: messageContext,
    permissions: COMMAND_PERMISSIONS
}
