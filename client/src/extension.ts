import { workspace, ExtensionContext, window } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions
} from 'vscode-languageclient';

let client: LanguageClient;

export async function activate(context: ExtensionContext) {
	// Startup options for the language server
	const serverOptions: ServerOptions = {
		command: "java",
		args: [
			`-Duser.project=${context.extensionPath}/resources`,
			"-jar",
			`${context.extensionPath}/resources/crypto-lsp-demo-0.0.1-SNAPSHOT.jar`
		]
	};
	
	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		// Register the server for Java documents
		documentSelector: [
			{ scheme: 'file', language: 'java' },
			{ scheme: 'jdt', language: 'java' },
		],
		synchronize: {
			configurationSection: 'java',
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: [ workspace.createFileSystemWatcher('**/*.java') ]
		}
	};

	// Create the language client and start the client. This will also launch the server
	client = new LanguageClient('CogniCrypt', 'CogniCrypt', serverOptions, clientOptions);
	client.start();
	await client.onReady();
	client.onNotification("cognicrypt/showCFG", async args => {
		const doc = await workspace.openTextDocument({ language: 'dot', content: args.dotString });
		window.showTextDocument(doc);
	});
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
