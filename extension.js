const vscode = require('vscode');

// Install
function activate(context) {
	// Implement commands here, defined in package.json
	commands = vscode.commands.registerCommand('terminalMacros.executeCommand', () => {
		if (vscode.window.activeTerminal) {
			// lastCommand = vscode.workspace.getConfiguration('TerminalMacros').get<string>('LastCommand');
			vscode.window.showInformationMessage('Executing Command');
			// vscode.window.activeTerminal.sendText(lastCommand, true);
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
