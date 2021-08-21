const vscode = require('vscode');

// vscode.window.showInformationMessage('Info');
// vscode.window.showErrorMessage('Error');

// Install
function activate(context) {
	// Implement commands here, defined in package.json
	commands = vscode.commands.registerCommand('terminalMacros.executeCommand', () => {
		// Options
		save = true;
		clear = true;
		execute = true; // Implemented
		focus = true; // Almost implemented

		// Get terminal
		terminal = vscode.window.activeTerminal;
		if (!terminal) {
			terminal = vscode.window.createTerminal();
		}

		// Send the command
		terminal.show(!focus);
		terminal.sendText('echo "Hello world :)"', execute);
	});

	context.subscriptions.push(commands);
}

// Uninstall
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
