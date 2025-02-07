module.exports = function (RED) {
    function QueueNode(config) {
        RED.nodes.createNode(this, config)

        const operationKey = config.operation
        const operationType = config.operationType

        const queue = this.context().get('queue') || []
        this.context().set('queue', queue)

        this.on('input', function (msg, send, done) {
            let operation

            if (operationType === 'msg') {
                operation = RED.util.getMessageProperty(msg, operationKey)
            } else if (operationType === 'flow') {
                operation = this.context().flow.get(operationKey)
            } else if (operationType === 'global') {
                operation = this.context().global.get(operationKey)
            }

            if (!operation) {
                this.error('Operation is not defined or invalid.', msg)
                done()
                return
            }

            if (operation === 'enqueue') {
                queue.push(msg.payload)
                send({ _queue: queue })
                this.context().set('queue', queue)
                this.status({ fill: 'green', shape: 'dot', text: `Enqueued: ${queue.length}` })
            } else if (operation === 'dequeue') {
                this.context().set('queue', queue)
                msg.payload = queue.shift()
                msg._queue = queue
                send(msg)
                if (queue.length > 0) {
                    this.status({ fill: 'blue', shape: 'dot', text: `Dequeued: ${queue.length}` })
                } else {
                    this.status({ fill: 'grey', shape: 'dot', text: 'Queue is empty' })
                }
            } else if (operation === 'get') {
                msg.payload = [...queue]
                msg._queue = queue
                send(msg)
                this.status({ fill: 'yellow', shape: 'dot', text: `Get: ${queue.length}` })
            } else if (operation === 'clear') {
                queue.length = 0
                this.context().set('queue', queue)
                send({ _queue: queue })
                this.status({ fill: 'grey', shape: 'dot', text: 'Queue is empty' })
            } else {
                this.error('Invalid operation. Use "enqueue", "dequeue", "get", or "clear".', msg)
            }

            done()
        })
    }

    RED.nodes.registerType("@background404_queue", QueueNode, {
        defaults: {
            name: { value: "" },
            operation: { value: "topic", required: true },
            operationType: { value: "msg", required: true }
        }
    })
}
