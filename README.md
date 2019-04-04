# CogniCrypt for Visual Studio Code
A minimal Visual Studio Code extension hosting the [CogniCrypt language server](https://github.com/SvenEV/CryptoLSPDemo).
Based on the official [lsp-sample project](https://github.com/Microsoft/vscode-extension-samples/tree/master/lsp-sample) discussed in the [Language Server Extension Guide](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide).

## Getting Started

### Language Server Setup
There's two ways for the VS Code extension (the *language client*) and the [CogniCrypt language server](https://github.com/SvenEV/CryptoLSPDemo) to communicate:
* **stdio**: VS Code starts a new instance of the language server and communicates over standard IO.
* **socket**: VS Code connects to an already running language server via a socket on port 5007. This is useful for debugging the language server.

The required setup depends on your choice of transport mode:
* **stdio**: The extension expects a JAR file (`crypto-lsp-demo-0.0.1-SNAPSHOT.jar`) in the "resources" folder, so you need to run `mvn package -DskipTests` on the language server to obtain the JAR and copy it to the "resources" folder.
* **socket**: Run the language server with the `-socket` argument, either from the command line or your favorite IDE.

### Language Client Setup
- Run `npm install` in the repository's root folder. This installs all necessary npm modules in the "client" folder.
- Open VS Code on the repository's root folder.
- Press Ctrl+Shift+B to compile the client.
- From the Debug viewlet, run the "Launch Client" config. This launches a new VS Code instance "[Extension Development Host]" with the CogniCrypt extension enabled.
- Open a Java file and wait for CogniCrypt to report something.

Under Settings > Extensions > CogniCrypt you can switch between the two transport modes **stdio** and **socket**.
