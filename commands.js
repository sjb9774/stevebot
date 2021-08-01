class BotCommand {
    constructor(executeFunction) {
        this.executeFunction = executeFunction;
    }

    execute(...rest) {
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

    constructor(say, listen) {
        this.handlers = [];
        this.resultHandler = (x) => x;
        this.say = say;
        this.listen = listen;
        this.currentMessage = {
            channel: null,
            target: null,
            user: null,
            rawMessage: null
        }
    }

    registerHandler(handler) {
        this.handlers.push(handler);
    }


    setResultHandler(handler) {
        this.resultHandler = handler;
    }

    dispatch(commandMessage) {
        this.handlers.forEach((handler) => {
            let handlerParams = {
                commandMessage,
                resultHandler: this.resultHandler.bind(this),
                say: this.say,
                listen: this.listen,
                messageContext: this.getCurrentMessageContext(),
                getCurrentMessageContext: this.getCurrentMessageContext.bind(this)
            }
            const result = handler(handlerParams);
            this.resultHandler({result, ...handlerParams});
        })
    }

    consume(message) {
        return this.dispatch(message);
    }

    getCurrentMessageContext() {
        return this.currentMessage;
    }

    onMessage(target, context, msg, self) {
        if (self) {
            return;
        }
        this.currentMessage = context;
        // add this to the normal context object and alias for intuitive use
        this.currentMessage.target = target;
        this.currentMessage.channel = target;
        try {
            this.consume(msg);
        } catch (err) {
            console.log(err);
        }
    }
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

    dispatch({commandMessage, resultHandler, say, listen, getCurrentMessageContext}) {
        this.commands.forEach((commandData) => {
            if (this.identify(commandMessage, commandData)) {
                const args = this.parseArgs(commandMessage);
                const result = commandData.command.execute(...args, {getCurrentMessageContext, say, listen});
                resultHandler({result, commandMessage, say, listen});
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
    permissions: COMMAND_PERMISSIONS
}
