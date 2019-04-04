import { workspace, ExtensionContext, window } from 'vscode';

import * as net from 'net';
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	StreamInfo
} from 'vscode-languageclient';

let client: LanguageClient;

export async function activate(context: ExtensionContext) {
	// Startup options for the language server
	const lspTransport = workspace.getConfiguration().get("cognicrypt.lspTransport", "stdio");

	const serverOptionsStdio = {
		command: "java",
		args: [
			`-Duser.project=${context.extensionPath}/resources`,
			"-jar",
			`${context.extensionPath}/resources/crypto-lsp-demo-0.0.1-SNAPSHOT.jar`
		]
	}

	const serverOptionsSocket = () => {
		const socket = net.connect({ port: 5007 });
		const result: StreamInfo = {
			writer: socket,
			reader: socket
		};
		return new Promise<StreamInfo>((resolve, reject) => {
			socket.on("connect", () => resolve(result));
			socket.on("error", _ =>
				window.showErrorMessage(
					"Failed to connect to CogniCrypt language server. Make sure that the language server is running " +
					"-or- configure the extension to connect via standard IO."));
		})
	}

	const serverOptions: ServerOptions =
		(lspTransport === "stdio") ? serverOptionsStdio :
			(lspTransport === "socket") ? serverOptionsSocket : null;

	if (!serverOptions)
		throw Error("Unsupported configuration value for 'cognicrypt.lspTransport': " + lspTransport)

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
			fileEvents: [workspace.createFileSystemWatcher('**/*.java')]
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
