import * as vscode from 'vscode';
import { promisify } from 'util';
import { exec as _exec } from 'child_process';
const exec = promisify(_exec);

type GitAPI = any;
type Provider = 'Gemini' | 'OpenAI';

const DEFAULT_ENDPOINTS: Record<Provider, string> = {
	'Gemini': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
	'OpenAI': 'https://api.openai.com/v1/chat/completions',
};

export function activate(context: vscode.ExtensionContext) {

	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statusBarItem.command = 'commitbot.generate';
	statusBarItem.text = `$(wand) Generate Commit`;
	statusBarItem.tooltip = 'CommitBot: Generate an AI commit message';
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

	const configureCommand = vscode.commands.registerCommand('commitbot.configure', async () => {
		const providerSelection = await vscode.window.showQuickPick(['Gemini', 'OpenAI'], {
			placeHolder: 'Select your AI provider',
		});

		if (!providerSelection) return;
        
        // This cast is now safe because we know the user selected from our specific list.
		const provider = providerSelection as Provider; 
		await vscode.workspace.getConfiguration('commitbot').update('provider', provider, vscode.ConfigurationTarget.Global);

		const endpoint = await vscode.window.showInputBox({
			prompt: `Enter the HTTP endpoint for ${provider}`,
			// The compiler now knows 'provider' is a valid key for DEFAULT_ENDPOINTS.
			value: vscode.workspace.getConfiguration('commitbot').get('endpoint') as string || DEFAULT_ENDPOINTS[provider],
			ignoreFocusOut: true,
		});

		if (endpoint !== undefined) {
			await vscode.workspace.getConfiguration('commitbot').update('endpoint', endpoint, vscode.ConfigurationTarget.Global);
		}

		const apiKey = await vscode.window.showInputBox({
			prompt: `Enter your ${provider} API key (will be stored securely)`,
			ignoreFocusOut: true,
			password: true
		});

		if (apiKey) {
			await context.secrets.store('commitbot.apiKey', apiKey);
			vscode.window.showInformationMessage(`CommitBot: ${provider} API Key saved successfully.`);
		}
	});

	const generateCommand = vscode.commands.registerCommand('commitbot.generate', async () => {
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'CommitBot: Generating commit message...',
			cancellable: true
		}, async () => {
			try {
				const repo = getActiveGitRepository();
				if (!repo) {
					vscode.window.showErrorMessage('CommitBot: No active Git repository found.');
					return;
				}

				const diffCommand = `git -C "${repo.rootUri.fsPath}" diff --staged`;
				const { stdout: diffOutput } = await exec(diffCommand);

				if (!diffOutput.trim()) {
					vscode.window.showWarningMessage('CommitBot: No staged changes found.');
					return;
				}

				const maxChars = vscode.workspace.getConfiguration('commitbot').get('maxDiffChars', 20000);
				let diffText = diffOutput;
				if (diffText.length > maxChars) {
					diffText = diffText.substring(0, maxChars) + '\n\n... [Diff Truncated] ...';
				}

				const logCommand = `git -C "${repo.rootUri.fsPath}" log -n 10 --pretty=format:"%s"`;
				const { stdout: logOutput } = await exec(logCommand);
				const lastCommits = (logOutput || '').trim();

				const prompt = `Based on the following git diff and recent commit history, generate a concise and conventional commit message. The commit message must have a subject line of 50 characters or less, followed by a blank line and an optional brief description.\n\nRecent commits:\n---\n${lastCommits || '[none]'}\n---\n\nStaged diff:\n---\n${diffText}\n---\n\nGenerate the commit message:`;

				const provider = vscode.workspace.getConfiguration('commitbot').get('provider', 'Gemini') as Provider;
				const userEndpoint = vscode.workspace.getConfiguration('commitbot').get('endpoint') as string;
				const apiKey = await context.secrets.get('commitbot.apiKey');
				const suggestionCount = vscode.workspace.getConfiguration('commitbot').get('suggestionCount', 3);

				if (!apiKey) {
					vscode.window.showErrorMessage('CommitBot is not configured. Run the "Configure" command.');
					return;
				}

				const endpoint = userEndpoint || DEFAULT_ENDPOINTS[provider];
				let requestBody;
				let headers: Record<string, string>;

				if (provider === 'OpenAI') {
					headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
					requestBody = { model: "gpt-3.5-turbo", messages: [{ role: "user", content: prompt }], n: suggestionCount };
				} else {
					headers = { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey };
					requestBody = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { candidateCount: suggestionCount } };
				}
				
				const response = await makeHttpRequest(endpoint, requestBody, headers);

				let suggestions: string[] = [];
				if (provider === 'OpenAI') {
					suggestions = response.choices?.map((choice: any) => choice.message.content.trim()) || [];
				} else {
					suggestions = response.candidates?.map((candidate: any) => candidate.content.parts[0].text.trim()) || [];
				}
				
				if (suggestions.length === 0) {
					console.error('CommitBot API Response:', response);
					vscode.window.showErrorMessage('CommitBot received no suggestions from the AI endpoint.');
					return;
				}

				const chosenMessage = await vscode.window.showQuickPick(suggestions, {
					placeHolder: 'Choose the best commit message',
					title: 'CommitBot: AI Suggestions'
				});

				if (chosenMessage) {
					repo.inputBox.value = chosenMessage;
				}

			} catch (error: any) {
				console.error(error);
				vscode.window.showErrorMessage(`CommitBot Error: ${error.message || 'An unknown error occurred.'}`);
			}
		});
	});

	context.subscriptions.push(configureCommand, generateCommand);
}

function getActiveGitRepository(): GitAPI | undefined {
	const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
	if (!gitExtension) return undefined;
	
	const api = gitExtension.getAPI(1);
	if (!api || api.repositories.length === 0) return undefined;

	const activeEditor = vscode.window.activeTextEditor;
	if (activeEditor) {
		const fileWorkspaceFolder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);
		if (fileWorkspaceFolder) {
			const repo = api.repositories.find((r: any) => r.rootUri.fsPath === fileWorkspaceFolder.uri.fsPath);
			if (repo) return repo;
		}
	}

	return api.repositories[0];
}

async function makeHttpRequest(endpoint: string, body: any, headers: Record<string, string>): Promise<any> {
	const response = await fetch(endpoint, {
		method: 'POST',
		headers: headers,
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const errorBody = await response.text();
		throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
	}
	return await response.json();
}

export function deactivate() { }