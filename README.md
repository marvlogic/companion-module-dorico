# Companion Module for Dorico

## Installation

1. Create a top-level `companion-modules` folder
1. Download the archive zip file from the releases page
1. Unzip the file into the `companion-modules` folder you created 

After this your folder structure should look like:

    companion-modules/companion-module-dorico/....

## Configure Companion to load modules

![alt](companion-ui.png)

1. In the companion icon, click `Show/Hide Window` 
2. Configure the `developer modules path` setting to point at the `companion-modules` folder
that you created earlier.
1. Launch the GUI

## Configure Companion Buttons

The module comes with some preset buttons for:

* Articulations
* Dynamics
* Editing
* Navigation
* Notes
* Transport

NB there are font issues - e.g. the `accent` articulation is upside down for
some reason TBD!

Most of these buttons are self-explanatory, a few have special behaviours:

* Note-Input button will enter/exit note input mode in Dorico, and toggle its
background on/off accordingly. 

* The left/right/up/down navigation buttons should respect the mode and move the
input caret in 'Note Input' mode, or change the selection otherwise.

* The Note Duration buttons will highlight themselves when a note is selected, as
will the articulation presets.

## Extending with custom commands

You can add custom buttons and send bespoke Dorico commands. You need to know
the Dorico command ID, which can be found by looking in Dorico's
`application.log` file (on MacOS: `$HOME/Library/Application
Support/Steinberg/Dorico 5/application.log`) after you have done the operation
in Dorico. 

For example, open the `Transpose...` dialog in Dorico. Then look at the end of
the log file - you will find that the associated command is
`Edit.TransposeSelection` (TODO: there is probably a list of these somewhere)

1. Create a new button
2. In `step 1`, select `+Add press action`
3. Start typing `dorico` and select `Send Dorico command`
4. Enter the Dorico command into the `Command` field.

A few more useful commands, not covered by the presets:

* Triplet input: `NoteInput.StartTupletRun?Definition=3:2`
* Move note left: `EventEdit.MoveLeft`
* Move note right: `EventEdit.MoveRight`
* Cycle items ('Tab'): `EventEdit.NavigateNextItemSamePosition`

## Feedbacks

These are mainly used by the preset buttons, but you could extend functionality
by using them if you wish.

* Duration-selected - change the colours of the button based on the selected note duration
* Latched-state-update - change colours of the button according to the state of `Variable ID`:
    - noteInputActive
    - inPlayback
    - isRecording
    - clickEnabled
    - insertActive

This is of limited use, but you can evaluate module variables in an expression
in a generic feedback e.g:

    $(dorico:latches)['insertActive'] == true
