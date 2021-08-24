const vscode = require('vscode');

// vscode.window.showInformationMessage('Info');
// vscode.window.showErrorMessage('Error');

//		Useful keys:
//		\u001b		Escape
//		\u001b[A	Up
//		\01			Select all
//		\03			Stop Process
//		\04			Logout
//		\10			Backspace
//		\13			Clear line before cursor
//		\14			Clear terminal
//		\26			Paste
//		\27			Clear line after cursor

function getCommands() {
	return vscode.workspace.getConfiguration().get('terminalMacros.commands.');
}

function getDefault(string) {
	return vscode.workspace.getConfiguration().get('terminalMacros.default.' + string);
}

function prepareCommand(commandText, terminalName, clear) {
	commandText = commandText.replaceAll('{recent}', '\u001b[A');
	// commandText = commandText.replaceAll('{paste}', '\26'); // Fix me in linux
	// await commandText = commandText.replaceAll('{paste}', await vscode.env.clipboard.readText()); // Fix me in linux
	// commandText = commandText.replaceAll('{file}', getEnvironment(uri || getOpenFileUri()).resource); // Fix me

	// Fix for clearing the screen and then getting a recent command in cmd
	if (terminalName == 'cmd' && clear && commandText == '\u001b[A') {
		commandText = '\u001b[A\u001b[A';
	}

	return commandText;
}

function prepareTerminal(terminal, stop, logout, clear, execute, commandText) {
	// Clear line
	if (terminal.name == 'cmd' || terminal.name == 'powershell') {
		terminal.sendText('\u001b', false);
	} else {
		terminal.sendText('\13\27', false);
	}

	// Stop
	if (stop) {
		terminal.sendText('\03', false);
	}

	// Logout
	if (logout) {
		terminal.sendText('\04', false);
	}

	// Clear terminal
	if (clear) {
		if (terminal.name == 'cmd') {
			terminal.sendText('cls');
		}
		else {
			terminal.sendText('\14', false);
		}
	}

	// Prepare command
	commandText = prepareCommand(commandText, terminal.name, clear);

	// Send command
	terminal.sendText(commandText, execute);
}

// Install
function activate(context) {
	// Implement commands here, defined in package.json
	commands = vscode.commands.registerCommand('terminalMacros.executeCommand', () => {
		// Get command and options
		group = 'General';
		name = 'Recent';
		commandText = '{recent}';
		save = true;
		stop = false;
		logout = false;
		clear = true;
		execute = true;
		focus = false; // Buggy when terminal is hidden. Terminal.show(preserveFocus: true) doesn't work

		// Get terminal
		terminal = vscode.window.activeTerminal;
		if (!terminal) {
			terminal = vscode.window.createTerminal();
		}
		terminal.show(!focus);

		// Prepare command placeholders
		commandText = prepareCommand(commandText, terminal.name, clear);

		// Save and prepare terminal
		if (save) {
			vscode.window.activeTextEditor.document.save().then(() => {
				prepareTerminal(terminal, stop, logout, clear, execute, commandText);
			});
		} else {
			prepareTerminal(terminal, stop, logout, clear, execute, commandText);
		}
	});

	context.subscriptions.push(commands);
}

// Uninstall
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
