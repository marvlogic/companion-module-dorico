export const notes = {
    // 'kBreve': '',
    'kSemibreve': '𝅝',
    'kMinim': '\u{1d15e}',
    'kCrotchet': '\u{1d15f}',
    'kQuaver': '\u{1d160}',
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

function mkPreset(duration) {
    return {
        type: "button",
        category: 'Notes',
        name: "Smart",
        style: {
            text: notes[duration],
            size: "auto",
            alignment: "center:center",
            color: 16777215,
            bgcolor: 0,
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
                    fg: 'rgb(210,210,210)',
                    bg: 'rgb(0,0,102)'
                }
            }
        ],
        steps: [
            {
                down: [
                    {
                        actionId: "send_command",
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
    // 'kStaccato': '𝅼',
    // 'kAccent': '𝅻',
    // 'kMarcato': '𝅿',
    // 'kTenuto': '',
    // 'kStaccatissimo': ''
    'kStaccato': '\u{1d17c}',
    'kAccent': '>',
    // 'kAccent': '\u{1d17b}',
    'kMarcato': '𝅿',
    'kTenuto': '_',
    // 'kStaccatissimo': '\''
}

function mkPresetArt(art) {
    return {
        type: "button",
        category: 'Articulations',
        name: "Articulation",
        style: {
            text: articulations[art],
            size: "18",
            alignment: "center:center",
            color: 16777215,
            bgcolor: 0,
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
                    fg: 'rgb(210,210,210)',
                    bg: 'rgb(0,0,102)'
                }
            }
        ],
        steps: [
            {
                down: [
                    {
                        actionId: "send_command",
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

function mkPresetEdit(editFlag) {
    return {
        type: "button",
        category: 'Editing',
        name: "Editing",
        style: {
            text: editFlags[editFlag].text,
            size: "18",
            alignment: "center:center",
            color: 16777215,
            bgcolor: 0,
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
                    fg: 'rgb(210,210,210)',
                    bg: 'rgb(0,0,102)'
                }
            }
        ],
        steps: [
            {
                down: [
                    {
                        actionId: "send_command",
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
    'ppp': 'ppp',
    'pp': 'pp',
    'p': 'p',
    'mp': 'mp',
    'mf': 'mf',
    'f': 'f',
    'ff': 'ff',
    'fff': 'fff',
}

function mkDynamicPreset(dyn) {
    return {
        type: "button",
        category: 'Dynamics',
        name: "Dynamics",
        style: {
            text: dynamics[dyn],
            size: "18",
            alignment: "center:center",
            color: 16777215,
            bgcolor: 0,
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
                        actionId: "send_command",
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
    '\u{23f5}\nSelection': {
        cmd: 'Play.StartOrStop?PlayFromLocation=kSelection',
        feedback: transportFeedback('inPlayback', 'rgb(0,150,0)')
    },
    '\u{23f5}': {
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

function mkTransportPreset(tpt) {
    return {
        type: "button",
        category: 'Transport',
        name: "Transport",
        style: {
            text: tpt,
            size: "16",
            alignment: "center:center",
            color: 16777215,
            bgcolor: 0,
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
                        actionId: "send_command",
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


export const presets = {
    ...Object.fromEntries(Object.keys(notes).map(x => [x, mkPreset(x)])),
    ...Object.fromEntries(Object.keys(articulations).map(x => [x, mkPresetArt(x)])),
    ...Object.fromEntries(Object.keys(editFlags).map(x => [x, mkPresetEdit(x)])),
    ...Object.fromEntries(Object.keys(dynamics).map(x => [x, mkDynamicPreset(x)])),
    ...Object.fromEntries(Object.keys(transport).map(x => [x, mkTransportPreset(x)])),
}
