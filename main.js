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
		this.setPresetDefinitions(presets)
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
			this.log('debug', `Connection opened`)
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
			this.log('debug', `Connection closed with code ${code}`)
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
				this.log(`debug`, `Setting sesssion token: ${this.sessionToken}`)
				const accept = {
					message: "acceptsessiontoken",
					sessionToken: this.sessionToken
				}
				this.ws.send(JSON.stringify(accept))
			} catch (e) {
				this.log(`error`, `Expecting handshake response, got ${msgValue}`)
			}
		} else if (msgValue.message == "status") {
			this.log(`debug`, `Status update`)
			const oldInputMode = this.getVariableValue('inputMode')
			var latches = this.getVariableValue('latches')
			var newLatches = Object.fromEntries(Object.keys(latches).map(
				x => [x, msgValue[x] != undefined ? msgValue[x] : latches[x]]
			))
			this.log(`debug`, `Old latches: ${JSON.stringify(latches)}`)
			this.log(`debug`, `New latches: ${JSON.stringify(newLatches)}`)
			const newvars = {
				'duration': msgValue.duration || "unk",
				'rhythmDots': msgValue.rhythmDots || "unk",
				'durationDot': msgValue.duration + (msgValue.rhythmDots > 0 ? "." : "") || "unk",
				'restMode': msgValue.restMode || false,
				'inputMode': msgValue.noteInputActive != undefined ? msgValue.noteInputActive : oldInputMode,
				'state': msgValue,
				'latches': newLatches
			}
			this.log(`debug`, `New variables ${JSON.stringify(newvars)}`)
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
			{
				type: 'static-text',
				id: 'info',
				width: 12,
				label: 'Information',
				value:
					"<strong>PLEASE READ THIS!</strong> Generic modules is only for use with custom applications. If you use this module to control a device or software on the market that more than you are using, <strong>PLEASE let us know</strong> about this software, so we can make a proper module for it. If we already support this and you use this to trigger a feature our module doesn't support, please let us know. We want companion to be as easy as possible to use for anyone.",
			},
			{
				type: 'textinput',
				id: 'url',
				label: 'Target URL',
				tooltip: 'The URL of the WebSocket server (ws[s]://domain[:port][/path])',
				width: 12,
				regex: '/' + this.wsRegex + '/',
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
				id: 'append_new_line',
				label: 'Append new line',
				tooltip: 'Append new line (\\r\\n) to commands',
				width: 6,
				default: true,
			},
			{
				type: 'checkbox',
				id: 'debug_messages',
				label: 'Debug messages',
				tooltip: 'Log incomming and outcomming messages',
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
					this.log(`info`, (this.getVariableValue('duration') == feedback.options.duration))
					if (this.getVariableValue('duration') == feedback.options.duration) {
						const dots = this.getVariableValue('rhythmDots') > 0 ? '.' : ''
						return {
							text: `${notes[feedback.options.duration]}${dots}`,
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
			send_command: {
				name: 'Send Dorico command',
				options: [
					{
						type: 'textinput',
						label: 'data',
						id: 'data',
						default: '',
						useVariables: true,
					},
				],
				callback: async (action, context) => {
					const value = await context.parseVariablesInString(action.options.data)
					if (this.config.debug_messages) {
						this.log('debug', `Message sent: ${value}`)
					}
					const msg = {
						message: "command",
						sessionToken: this.sessionToken,
						command: value
					}
					this.ws.send(JSON.stringify(msg))
					this.log('debug', `Message sent: ${msg}`)
				},
			},
		})
	}
}

runEntrypoint(WebsocketInstance, upgradeScripts)
