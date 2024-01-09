

export class cueExecutor  {
    constructor(channels) {
        if (!Array.isArray(channels)) throw new Error('Parameter "channels" must be type "Array"!')
        if (channels.length < 1) throw new Error('Parameter "channels" must include at leat 1 element!')

        this.channels = channels
        this.cues = {}

        this._executorRunning = false
        this._executorBlock = false

        for (const channel of channels) { this.cues[channel] = [] }
    }

    async _startExecutor() {
        this._executorRunning = true

        while (this._executorRunning === true) {
            let endExecutor = true
            for (const channel of Object.keys(this.cues)) {
                if (this.cues[channel].length === 0) continue

                endExecutor = false
                await this.cues[channel].shift()()
            }

            if (endExecutor === true) break
        }
    }

    run(channel, func) {
        // throw error on invalid channel
        if (this.cues[channel] === undefined) throw new Error('Parameter "channel" must be ' + Object.keys(this.cues) + ' !')

        return new Promise((resolve, reject) => {
            // handle blocked execution
            if (this._executorBlock === true) reject({
                name: 'ExecutionBlock',
                options: { url: '' }
            })
            else {
                // handle function execution
                this.cues[channel].push(async () => {
                    func().then((res) => resolve(res)).catch((error) => reject(error))
                })

                // start "Executor" to process all cues
                if (this._executorRunning !== true) this._startExecutor()
            }
        })
    }

    block() {
        this._executorBlock = true
        this._executorRunning = false
    }

    unblock() {
        this._executorBlock = false
    }

    stop() {
        this._executorRunning = false
    }

    clear(channel=null) {
        if (this.cues[channel] !== undefined) {
            this.cues[channel] = []
        }
        else if (channel === null) {
            for (const ch of Object.keys(this.cues)) { this.cues[ch] = [] }
        }
    }
}