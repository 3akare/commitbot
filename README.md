# CommitBot AI for VS Code

![CommitBot Icon](images/icon.png)

Generate clear, conventional, and context-aware commit messages with the power of AI, directly inside your editor. CommitBot analyzes your staged changes and commit history to suggest high-quality messages that match your style.



## Tired of writing commit messages? Let AI do the heavy lifting.

CommitBot integrates seamlessly into your Git workflow, providing intelligent suggestions that save you time and improve your commit hygiene.

![CommitBot Demo](images/commitbot.gif)


## Features

*   **✨ AI-Powered Suggestions:** Leverages powerful LLMs (Gemini or OpenAI) to generate relevant commit messages.
*   **🚀 Multiple Choices:** Generates several suggestions, allowing you to pick the one that fits best.
*   **🧠 Context-Aware:** Analyzes your staged `git diff` and recent commit history to understand the context and match your style.
*   **Seamless UI:** Access message generation from the Source Control title bar or the main Status Bar.
*   **Multi-Provider Support:** Choose between Google Gemini and OpenAI as your AI provider.
*   **🔒 Secure:** Your API keys are stored safely and securely using VS Code's native `SecretStorage`.

## Quickstart

1.  **Install** the CommitBot AI extension from the VS Code Marketplace.

2.  **Configure the AI Provider:**
    *   Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
    *   Run the command: `CommitBot: Configure API Key / Endpoint`.
    *   Choose your preferred AI provider (Gemini or OpenAI).
    *   Enter your API key when prompted. It will be stored securely.

3.  **Generate a Commit Message:**
    *   Stage your file changes in the Source Control panel.
    *   Click the **✨ icon** in the Source Control title bar, or click the **✨ Generate Commit** button in the bottom status bar.
    *   A dropdown will appear with several AI-generated suggestions.
    *   Select the best one, and it will automatically fill the commit input box.

## Extension Settings

You can configure CommitBot in your VS Code settings (`settings.json`).

| Setting                   | Description                                                                                              | Default  |
| ------------------------- | -------------------------------------------------------------------------------------------------------- | -------- |
| `commitbot.provider`      | The AI provider to use. Choose between `Gemini` or `OpenAI`.                                             | `Gemini` |
| `commitbot.suggestionCount` | The number of commit message suggestions to generate.                                                    | `3`      |
| `commitbot.endpoint`      | Optional: Provide a custom HTTP endpoint for your AI model. If blank, the default is used.               | `""`     |
| `commitbot.maxDiffChars`    | The maximum number of characters from the git diff to include in the prompt to the AI.                   | `20000`  |

## Commands

| Command                               | Description                                          |
| ------------------------------------- | ---------------------------------------------------- |
| `CommitBot: Generate Commit Message`  | Generates AI commit suggestions for staged changes.  |
| `CommitBot: Configure API Key / Endpoint` | Sets up your AI provider and secure API key.         |

---

## Feedback & Contributing

This is an open-source project. If you find a bug or have a feature request, please [open an issue on GitHub](https://github.com/YOUR_USERNAME/YOUR_REPO_NAME/issues).

## License

[MIT License](LICENSE.md)