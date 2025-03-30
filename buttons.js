export const notes = {
    // 'kBreve': '',
    'kSemibreve': '𝅝',
    'kMinim': '\u{1d15e}',
    'kCrotchet': '\u{1d15f}',
    'kQuaver': '\u{1d160}',
    // 'kQuaver': '\u{266a}',
    'kSemiQuaver': '\u{1d161}',
    'kDemiSemiQuaver': '\u{1d162}',
    'kHemiDemiSemiQuaver': '\u{1d163}',
    // 'kMinim': '𝅗𝅥',
    // 'kCrotchet': '𝅘𝅥',
    // 'kQuaver': '𝅘𝅥𝅮',
    // 'kQuaver': '𝅥𝅮\u{1D160}',
    // 'kSemiQuaver': '𝅘𝅥𝅯',
    // 'kDemiSemiQuaver': '𝅘𝅥𝅰',
    // 'kHemiDemiSemiQuaver': '𝅘𝅥𝅱',
}

function mkNotePreset(config, duration) {
    return {
        type: "button",
        category: 'Notes',
        name: "Smart",
        style: {
            text: notes[duration],
            size: "auto",
            alignment: "center:center",
            color: config.defaultColour,
            bgcolor: config.defaultBgColour,
            show_topbar: "default"
        },
        options: {
            rotaryActions: false,
            stepAutoProgress: true
        },
        feedbacks: [
            {
                feedbackId: "duration",
                options: {
                    duration: duration,
                    fg: config.defaultSelectedColour,
                    bg: config.defaultSelectedBgColour,
                }
            }
        ],
        steps: [
            {
                down: [
                    {
                        actionId: "sendCommand",
                        options: {
                            data: `NoteInput.NoteValue?LogDuration=${duration}`
                        }
                    }
                ],
                up: []

            }
        ]
    }
}

export const articulations = {
    'kStaccato': '\u{1d160}\u{1d17c}',
    // 'kAccent': '\u{1d160}\u{0302}',
    'kAccent': '\u{1d160}\u{1D17B}',
    // 'kAccent': '\u{1d17b}',
    // 'kMarcato': '𝅿',
    'kMarcato': '\u{1d160}\u{1D17F}',
    'kTenuto': '\u{1d160}\u{1D17D}',
    // 'kTenuto': '_',
    // 'kStaccatissimo': '\''
}

function mkArticulationPreset(config, art) {
    return {
        type: "button",
        category: 'Articulations',
        name: "Articulation",
        style: {
            text: articulations[art],
            size: "auto",
            alignment: "center:center",
            color: config.defaultColour,
            bgcolor: config.defaultBgColour,
            show_topbar: "default"
        },
        options: {
            rotaryActions: false,
            stepAutoProgress: true
        },
        feedbacks: [
            {
                feedbackId: "stateUpdate",
                options: {
                    variableId: `articulation${art.substring(1)}`,
                    fg: config.defaultSelectedColour,
                    bg: config.defaultSelectedBgColour,
                }
            }
        ],
        steps: [
            {
                down: [
                    {
                        actionId: "sendCommand",
                        options: {
                            data: `NoteInput.SetArticulation?Value=${art}`
                        }
                    }
                ],
                up: []

            }
        ]
    }
}

export const editFlags = {
    'insertActive': { text: 'Insert', cmd: "NoteInput.Mode" },
    'noteInputActive': { text: 'Note Input', cmd: "NoteInput.Enter?Set=1" },
}

function mkEditPreset(config, editFlag) {
    return {
        type: "button",
        category: 'Editing',
        name: "Editing",
        style: {
            text: editFlags[editFlag].text,
            size: "18",
            alignment: "center:center",
            color: config.defaultColour,
            bgcolor: config.defaultBgColour,
            show_topbar: "default"
        },
        options: {
            rotaryActions: false,
            stepAutoProgress: true
        },
        feedbacks: [
            {
                feedbackId: "latchUpdate",
                options: {
                    variableId: editFlag,
                    fg: config.defaultSelectedColour,
                    bg: config.defaultSelectedBgColour,
                }
            }
        ],
        steps: [
            {
                down: [
                    {
                        actionId: "sendCommand",
                        options: {
                            data: editFlags[editFlag].cmd
                        }
                    }
                ],
                up: []

            }
        ]
    }
}

export const dynamics = {
    'ppp': '𝆏𝆏𝆏',
    'pp': '𝆏𝆏',
    'p': '𝆏',
    'mp': '𝆐𝆏',
    'mf': '𝆐𝆑',
    'f': '𝆑',
    'ff': '𝆑𝆑',
    'fff': '𝆑𝆑𝆑',
}

function mkDynamicPreset(config, dyn) {
    return {
        type: "button",
        category: 'Dynamics',
        name: "Dynamics",
        style: {
            text: dynamics[dyn],
            size: "auto",
            alignment: "center:center",
            color: config.defaultColour,
            bgcolor: config.defaultBgColour,
            show_topbar: "default"
        },
        options: {
            rotaryActions: false,
            stepAutoProgress: true
        },
        feedbacks: [
        ],
        steps: [
            {
                down: [
                    {
                        actionId: "sendCommand",
                        options: {
                            data: `NoteInput.CreateDynamic?Definition=${dyn}`
                        }
                    }
                ],
                up: []

            }
        ]
    }
}

function transportFeedback(vid, bgcolour) {
    return {
        feedbackId: "latchUpdate",
        options: {
            variableId: vid,
            fg: 'rgb(210,210,210)',
            bg: bgcolour
        }
    }
}

export const transport = {
    '\u{21ba}\u{23f5}\n': {
        cmd: 'Play.StartOrStop?PlayFromLocation=kSelection',
        feedback: transportFeedback('inPlayback', 'rgb(0,150,0)')
    },
    '\u{23ef}': {
        cmd: 'Play.StartOrStop?Set=true',
        feedback: transportFeedback('inPlayback', 'rgb(0,150,0)')
    },
    '\u{23f9}': { cmd: 'Play.Stop', feedback: {} },
    '\u{23fa}': {
        cmd: 'Play.Record?Set=true',
        feedback: transportFeedback('isRecording', 'rgb(150,0,0)')
    },
    '\u{231b}': {
        cmd: 'Play.EnableClick',
        feedback: transportFeedback('clickEnabled', 'rgb(0,0,102)')
    },
}

function mkTransportPreset(config, tpt) {
    return {
        type: "button",
        category: 'Transport',
        name: "Transport",
        style: {
            text: tpt,
            size: "auto",
            alignment: "center:center",
            color: config.defaultColour,
            bgcolor: config.defaultBgColour,
            show_topbar: "default"
        },
        options: {
            rotaryActions: false,
            stepAutoProgress: true
        },
        feedbacks: [transport[tpt].feedback],
        steps: [
            {
                down: [
                    {
                        actionId: "sendCommand",
                        options: {
                            data: transport[tpt].cmd
                        }
                    }
                ],
                up: []

            }
        ]
    }
}

const navigation = {
    'Up': '⬆️',
    'Down': '⬇️',
    'Left': '⬅️',
    'Right': '➡️'
}

function mkNavigatePreset(config, nav) {
    return {
        type: "button",
        category: 'Navigation',
        name: "Navigation",
        style: {
            text: navigation[nav],
            size: "auto",
            alignment: "center:center",
            color: config.defaultColour,
            bgcolor: config.defaultBgColour,
            show_topbar: "default"
        },
        options: {
            rotaryActions: false,
            stepAutoProgress: true
        },
        // feedbacks: [transport[tpt].feedback],
        steps: [
            {
                down: [
                    {
                        actionId: "moveCursor",
                        options: {
                            direction: nav
                        }
                    }
                ],
                up: []

            }
        ]
    }
}


export function presets(config) {
    return {
        ...Object.fromEntries(Object.keys(notes).map(x => [x, mkNotePreset(config, x)])),
        ...Object.fromEntries(Object.keys(articulations).map(x => [x, mkArticulationPreset(config, x)])),
        ...Object.fromEntries(Object.keys(editFlags).map(x => [x, mkEditPreset(config, x)])),
        ...Object.fromEntries(Object.keys(dynamics).map(x => [x, mkDynamicPreset(config, x)])),
        ...Object.fromEntries(Object.keys(transport).map(x => [x, mkTransportPreset(config, x)])),
        ...Object.fromEntries(Object.keys(navigation).map(x => [x, mkNavigatePreset(config, x)])),
    }
}