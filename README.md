# Terminal Macros

*Use the terminal without using the terminal.*

## Add Your Commands

Add and organize all of your commands.

 - settings.json

```jsonc
"terminalMacros.commands": [
	{
		"command": "echo Hello world"
	},
	{
		// Required
		"command": "{recent}", // {recent} = the command that was run most recently

		// Optional
		"group": "General", // Used for organization
		"name": "Last Command", // The pretty name
		"save": true, // Saves your file
		"show": true, // Shows the terminal
		"stop": false, // Control c
		"logout": false, // Control d
		"clear": true, // Clear the terminal
		"execute": true, // Execute the command
		"focus": false // Focus on the terminal
	},
	{
		"group": "General",
		"name": "Run File",
		"command": "./{file}" // {file} = name of the current file in the editor
	},
	{
		"group": "General",
		"name": "Paste",
		"command": "{paste}" // {paste} = the last thing copied
	},
	{
		"group": "General",
		"name": "Full Path",
		"command": "echo {path}" // {path} = full path of the current file in the editor
	},
	{
		"group": "General",
		"name": "Execute Selected",
		"command": "{selection}", // {selection} = selected text in the editor
		"execute": true
	},
],
```

## Edit Default Command Options

Useful if you always want to clear the terminal, save your file, etc.

 - Settings

 - settings.json

```jsonc
"terminalMacros.default.clear": true,
"terminalMacros.default.execute": true,
"terminalMacros.default.focus": false,
"terminalMacros.default.logout": false,
"terminalMacros.default.save": true,
"terminalMacros.default.show": true,
"terminalMacros.default.stop": false,
```

## Execute a Command with Keyboard Shortcuts

Use your most frequent commands with keyboard shortcuts.

 - keybindings.json

```jsonc
{
	"key": "f1",
	"command": "terminalMacros.executeCommand",
	"args": 0 // Required: command number, a 0-based index in the array
},
```

## List All Commands in Quick Pick Menu

See all your commands in the quick pick menu.

 - Command Pallete: "Terminal Macros: List Commands"

 - Keyboard Shortcuts

 - keybindings.json

```jsonc
{
	"key": "f2",
	"command": "terminalMacros.listCommands"
},
```
