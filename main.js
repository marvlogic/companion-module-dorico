import { InstanceBase, runEntrypoint, InstanceStatus } from '@companion-module/base'
import WebSocket from 'ws'
import objectPath from 'object-path'
import { upgradeScripts } from './upgrade.js'
import { presets, notes } from './buttons.js'

class WebsocketInstance extends InstanceBase {
	isInitialized = false
	sessionToken = null

	subscriptions = new Map()
	wsRegex = '^wss?:\\/\\/([\\da-z\\.-]+)(:\\d{1,5})?(?:\\/(.*))?$'

	async init(config) {
		this.config = config

		this.initWebSocket()
		this.isInitialized = true

		// this.updateVariables()
		this.initActions()
		this.initFeedbacks()
		this.subscribeFeedbacks()
		this.setVariableDefinitions([
			{ variableId: 'duration', name: 'Currently Selected duration' },
			{ variableId: 'durationDot', name: `Currently Selected with '.' suffix if rhythmDots >0 ` },
			{ variableId: 'rhythmDots', name: 'Currently Selected dots' },
			{ variableId: 'restMode', name: 'In rest-mode' },
			{ variableId: 'inputMode', name: 'Note input mode' },
			{ variableId: 'state', name: 'state' },
			{ variableId: 'latches', name: 'latches' }
		])
		this.setPresetDefinitions(presets(config))
		this.setVariableValues({
			latches: {
				noteInputActive: false,
				inPlayback: false,
				isRecording: false,
				clickEnabled: false,
				insertActive: false,
			}
		})
		this.setActionDefinitions
	}

	async destroy() {
		this.isInitialized = false
		if (this.reconnect_timer) {
			clearTimeout(this.reconnect_timer)
			this.reconnect_timer = null
		}
		if (this.ws) {
			this.ws.close(1000)
			delete this.ws
		}
	}

	async configUpdated(config) {
		this.config = config
		this.initWebSocket()
	}

	updateVariables(callerId = null) {
		let variables = new Set()
		let defaultValues = {}
		this.subscriptions.forEach((subscription, subscriptionId) => {
			if (!subscription.variableName.match(/^[-a-zA-Z0-9_]+$/)) {
				return
			}
			variables.add(subscription.variableName)
			if (callerId === null || callerId === subscriptionId) {
				defaultValues[subscription.variableName] = ''
			}
		})
		let variableDefinitions = []
		variables.forEach((variable) => {
			variableDefinitions.push({
				name: variable,
				variableId: variable,
			})
		})
		this.setVariableDefinitions(variableDefinitions)
		if (this.config.reset_variables) {
			this.setVariableValues(defaultValues)
		}
	}

	maybeReconnect() {
		if (this.isInitialized && this.config.reconnect) {
			if (this.reconnect_timer) {
				clearTimeout(this.reconnect_timer)
			}
			this.reconnect_timer = setTimeout(() => {
				this.initWebSocket()
			}, 5000)
		}
	}

	initWebSocket() {
		if (this.reconnect_timer) {
			clearTimeout(this.reconnect_timer)
			this.reconnect_timer = null
		}

		const url = this.config.url
		if (!url || url.match(new RegExp(this.wsRegex)) === null) {
			this.updateStatus(InstanceStatus.BadConfig, `WS URL is not defined or invalid`)
			return
		}

		this.updateStatus(InstanceStatus.Connecting)

		if (this.ws) {
			this.ws.close(1000)
			delete this.ws
		}
		this.ws = new WebSocket(url)

		this.ws.on('open', () => {
			this.updateStatus(InstanceStatus.Ok)
			this.log('info', `Connection opened`)
			// if (this.config.reset_variables) {
			// 	this.updateVariables()
			// }
			this.log('info', `Sending handshake`)
			const handshake = {
				message: "connect",
				clientName: "Companion",
				handshakeVersion: "1.0"
			}
			this.ws.send(JSON.stringify(handshake))
		})
		this.ws.on('close', (code) => {
			this.sessionToken = null
			this.log('info', `Connection closed with code ${code}`)
			this.updateStatus(InstanceStatus.Disconnected, `Connection closed with code ${code}`)
			this.maybeReconnect()
		})

		this.ws.on('message', this.messageReceivedFromWebSocket.bind(this))

		this.ws.on('error', (data) => {
			this.log('error', `WebSocket error: ${data}`)
		})
	}

	messageReceivedFromWebSocket(data) {
		if (this.config.debug_messages) {
			this.log('debug', `Message received: ${data}`)
		}

		let msgValue = null
		try {
			msgValue = JSON.parse(data)
		} catch (e) {
			msgValue = data
		}
		if (this.sessionToken == null) {
			try {
				this.sessionToken = msgValue.sessionToken
				if (this.config.debug_messages) {
					this.log(`debug`, `Setting sesssion token: ${this.sessionToken}`)
				}
				const accept = {
					message: "acceptsessiontoken",
					sessionToken: this.sessionToken
				}
				this.ws.send(JSON.stringify(accept))
			} catch (e) {
				this.log(`error`, `Expecting handshake response, got ${msgValue}`)
			}
		} else if (msgValue.message == "status") {
			if (this.config.debug_messages) {
				this.log(`debug`, `Status update`)
			}
			const oldInputMode = this.getVariableValue('inputMode')
			var latches = this.getVariableValue('latches')
			var newLatches = Object.fromEntries(Object.keys(latches).map(
				x => [x, msgValue[x] != undefined ? msgValue[x] : latches[x]]
			))
			if (this.config.debug_messages) {
				this.log(`debug`, `Old latches: ${JSON.stringify(latches)}`)
				this.log(`debug`, `New latches: ${JSON.stringify(newLatches)}`)
			}
			const newvars = {
				'duration': msgValue.duration || "unk",
				'rhythmDots': msgValue.rhythmDots || "unk",
				'durationDot': msgValue.duration + (msgValue.rhythmDots > 0 ? "." : "") || "unk",
				'restMode': msgValue.restMode || false,
				'inputMode': msgValue.noteInputActive != undefined ? msgValue.noteInputActive : oldInputMode,
				'state': msgValue,
				'latches': newLatches
			}
			if (this.config.debug_messages) {
				this.log(`debug`, `New variables ${JSON.stringify(newvars)}`)
			}
			this.setVariableValues(newvars)
			this.checkFeedbacks('duration', 'stateUpdate', 'latchUpdate')
		}

		// this.subscriptions.forEach((subscription) => {
		// 	if (subscription.variableName === '') {
		// 		return
		// 	}
		// 	if (subscription.subpath === '') {
		// 		this.setVariableValues({
		// 			[subscription.variableName]: typeof msgValue === 'object' ? JSON.stringify(msgValue) : msgValue,
		// 		})
		// 	} else if (typeof msgValue === 'object' && objectPath.has(msgValue, subscription.subpath)) {
		// 		let value = objectPath.get(msgValue, subscription.subpath)
		// 		this.setVariableValues({
		// 			[subscription.variableName]: typeof value === 'object' ? JSON.stringify(value) : value,
		// 		})
		// 	}
		// })
	}

	getConfigFields() {
		return [
			// {
			// type: 'static-text',
			// id: 'info',
			// width: 12,
			// label: 'Information',
			// value:
			// "",
			// },
			{
				type: 'textinput',
				id: 'url',
				label: 'Dorico URL',
				tooltip: 'The URL of the Dorico WebSocket server (ws[s]://domain[:port][/path])',
				width: 12,
				regex: '/' + this.wsRegex + '/',
				default: 'ws://127.0.0.1:4560'
			},
			{
				type: 'colorpicker',
				id: 'defaultColour',
				label: 'Default foreground clour',
				tooltip: 'Default colour for button foreground/text',
				width: 6,
				default: 'rgb(0,0,0)'
			},
			{
				type: 'colorpicker',
				id: 'defaultBgColour',
				label: 'Default background clour',
				tooltip: 'Default colour for button background',
				width: 6,
				default: 'rgb(163, 149, 119)'
			},
			{
				type: 'colorpicker',
				id: 'defaultSelectedColour',
				label: 'Default foreground selected colour',
				tooltip: 'Default colour for selected button foreground/text',
				width: 6,
				default: 'rgb(255,255,255)'
			},
			{
				type: 'colorpicker',
				id: 'defaultSelectedBgColour',
				label: 'Default background selected colour',
				tooltip: 'Default colour for selected button background',
				width: 6,
				default: 'rgb(0, 0, 102)'
			},
			{
				type: 'checkbox',
				id: 'reconnect',
				label: 'Reconnect',
				tooltip: 'Reconnect on WebSocket error (after 5 secs)',
				width: 6,
				default: true,
			},
			{
				type: 'checkbox',
				id: 'debug_messages',
				label: 'Debug messages',
				tooltip: 'Log incomming and outcomming messages',
				default: false,
				width: 6,
			},
			{
				type: 'checkbox',
				id: 'reset_variables',
				label: 'Reset variables',
				tooltip: 'Reset variables on init and on connect',
				width: 6,
				default: true,
			},
		]
	}

	initFeedbacks() {
		this.setFeedbackDefinitions({
			'duration': {
				type: 'advanced',
				name: 'Duration Selected',
				options: [{
					type: 'textinput',
					label: 'Duration',
					id: 'duration',
					default: 'kCrotchet'
				}, {
					id: 'fg',
					type: 'colorpicker',
					label: 'Note colour',
					default: 'rgb(210,210,210)'
				}, {
					id: 'bg',
					type: 'colorpicker',
					label: 'Background colour',
					default: 'rgb(0,0,102)'
				}],
				// defaultStyle: {
				// 	bgcolor: 0x000066,
				// 	color: 0xFFFFFF
				// },
				callback: (feedback, ctx) => {
					if (this.config.debug_messages) {
						this.log(`debug`, (this.getVariableValue('duration') == feedback.options.duration))
					}
					if (this.getVariableValue('duration') == feedback.options.duration) {
						const dots = ['', '.', '..', '...', '....']
						return {
							text: `${notes[feedback.options.duration]}${dots[this.getVariableValue('rhythmDots')]}`,
							color: feedback.options.fg,
							bgcolor: feedback.options.bg
						}
					}
					return {
						text: `${notes[feedback.options.duration]}`
					}
				},
			},
			'stateUpdate': {
				type: 'advanced',
				name: 'State Update',
				options: [{
					type: 'textinput',
					label: 'Variable ID',
					id: 'variableId',
					default: 'articulationAccent'
				}, {
					id: 'fg',
					type: 'colorpicker',
					label: 'Font colour',
					default: 'rgb(210,210,210)'
				}, {
					id: 'bg',
					type: 'colorpicker',
					label: 'Background colour',
					default: 'rgb(0,0,102)'
				}],
				callback: (feedback, ctx) => {
					var state = this.getVariableValue(feedback.options.variableId)
					if (state != true && state != false) {
						state = this.getVariableValue('state')
						state = state[feedback.options.variableId]
					}
					if (state) {
						return {
							color: feedback.options.fg,
							bgcolor: feedback.options.bg
						}
					}
					return {}
				}
			},
			'latchUpdate': {
				type: 'advanced',
				name: 'Latched State Update',
				options: [{
					type: 'textinput',
					label: 'Variable ID',
					id: 'variableId',
					default: 'inPlayback'
				}, {
					id: 'fg',
					type: 'colorpicker',
					label: 'Font colour',
					default: 'rgb(210,210,210)'
				}, {
					id: 'bg',
					type: 'colorpicker',
					label: 'Background colour',
					default: 'rgb(0,0,102)'
				}],
				callback: (feedback, ctx) => {
					const val = this.getVariableValue('latches')[feedback.options.variableId]
					if (val) {
						return {
							color: feedback.options.fg,
							bgcolor: feedback.options.bg
						}
					}
					return {}
				}
			}
		})
	}

	initActions() {
		this.setActionDefinitions({
			sendCommand: {
				name: 'Send Dorico command',
				options: [
					{
						type: 'textinput',
						label: 'Command',
						id: 'data',
						default: '',
						useVariables: true,
					},
				],
				callback: async (action, context) => {
					const value = await context.parseVariablesInString(action.options.data)
					const msg = {
						message: "command",
						sessionToken: this.sessionToken,
						command: value
					}
					this.ws.send(JSON.stringify(msg))
					if (this.config.debug_messages) {
						this.log('debug', `Message sent: ${value}`)
					}
				},
			},
			moveCursor: {
				name: 'Move the edit or selection cursor',
				options: [
					{
						type: 'dropdown',
						label: 'Direction',
						id: 'direction',
						choices: [
							{ id: 'Up', label: 'Up' },
							{ id: 'Down', label: 'Down' },
							{ id: 'Left', label: 'Left' },
							{ id: 'Right', label: 'Right' }
						],
						default: 'up',
					},
				],
				callback: async (action, context) => {
					var value
					if (this.getVariableValue('latches').noteInputActive) {
						value = `NoteInput.Move${action.options.direction}`
					} else {
						value = `EventEdit.Navigate${action.options.direction}`
					}
					const msg = {
						message: "command",
						sessionToken: this.sessionToken,
						command: value
					}
					this.ws.send(JSON.stringify(msg))
					if (this.config.debug_messages) {
						this.log('debug', `Message sent: ${value}`)
					}
				},
			},
		})
	}
}

runEntrypoint(WebsocketInstance, upgradeScripts)
