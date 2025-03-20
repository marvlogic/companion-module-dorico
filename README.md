# Companion Module for Dorico

* Status: Under active development

## Installation

1. Create a top-level `companion-modules` folder
1. Download the archive zip file from the releases page
1. Unzip the file into the `companion-modules` folder you created 

After this your folder structure should look like:

    companion-modules/companion-module-dorico/....

## Configure Companion to load external modules

<!-- ![alt](companion-ui.png) -->

1. In the companion icon, click `Show/Hide Window` 
1. Click the 'settings cog' in the top-right
2. Configure the `developer modules path` setting to point at the `companion-modules` folder
that you created earlier.
1. Launch the GUI (Opens in a browser)

## Configure Companion Connection

1. Under `Connections` in the web interface, look for `Dorico` and add it

1. The main defaults should be ok. 

1. If you want to change the default colours for the preset buttons, you should
do this now. Then remember to 'save' the changes and toggle the module off and
on again for the changes to take effect.

Note that once you drag a preset button onto a page, it becomes an independent
entity; changes to the module colour defaults will not affect it.

## Configure Companion Buttons

The module comes with a (limited) selection of preset buttons for:

* Articulations
* Dynamics
* Editing
* Navigation
* Notes
* Transport

More presets will be added as time allows. See below if you wish to add your own
command buttons.


Most of these buttons are self-explanatory, a few have special behaviours:

* Note-Input button will enter/exit note input mode in Dorico, and toggle its
background on/off accordingly. 

* The left/right/up/down navigation buttons should respect the mode and move the
input caret in 'Note Input' mode, or change the selection when not.

* The Note Duration buttons will highlight themselves when a note is selected, as
will the articulation presets.

* There are font issues - e.g. the `marcato` articulation is upside down for
some reason (TBD)!


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

* Staccatissimo: `NoteInput.SetArticulation?Value=kStaccatissimo`
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

## Advanced

There are a few hacks you can do with Companion's native functionality. 

### Shift button

You can create a dedicated page for buttons that you don't need constant access
to, for example the Dynamics buttons can all be placed on a single page, and
have this page displayed temporarily when another button is pressed.

1. Create dynamics buttons on a clean page in Companion.
1. Create a shift-button on your main page
1. On the shift-button:
- In 'Press actions' add an `internal: Surface: set to page`, set the page to the dynamics page.
- In 'Release actions' add an `internal: Surface: set to page`, set the page to 'This page'.

When you hold the shift-button the dynamics page appears, and you can use those
buttons as long as you keep the shift-button held down.

### Note Input

In a similar way, you can jump to another page when the 'Note Input' button is
selected (just don't define the 'release action'). If you also have the 'Note
Input' button on the target page then you can have that button return to the
main page when it is pressed.