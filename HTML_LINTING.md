# HTML Linting Configuration

This project includes HTML linting configuration files to help maintain code quality and catch common issues.

## Configuration Files

### 1. `.htmlhintrc`
HTMLHint configuration file for basic HTML validation.

**Key Rules:**
- Enforces lowercase tag and attribute names
- Requires double quotes for attribute values
- Ensures unique IDs
- Requires alt text for images
- Allows inline styles (disabled by default in strict mode, but enabled here for flexibility)
- Validates HTML5 doctype

### 2. `.htmlvalidate.json`
Modern HTML validation using html-validate library with accessibility rules.

**Key Features:**
- WCAG accessibility checks
- ARIA attribute validation
- Form element validation
- Semantic HTML recommendations
- Requires `aria-label` for select elements

### 3. `.vscode/settings.json`
VS Code editor settings for HTML validation and formatting.

**Features:**
- HTML validation enabled
- Formatting preferences
- HTMLHint integration
- Code actions on save

## Usage

### Install HTML Linting Tools (Optional)

```bash
# Install HTMLHint globally or locally
npm install --save-dev htmlhint

# Or install html-validate
npm install --save-dev html-validate
```

### Run Linting

```bash
# Using npm scripts
npm run lint:html

# Or directly with HTMLHint
npx htmlhint web-gui/public/**/*.html

# Or with html-validate
npx html-validate web-gui/public/**/*.html
```

## Common Issues Addressed

### 1. Inline Styles
**Status:** Allowed (warnings only)
- Inline styles are allowed but will show warnings
- Consider moving to external CSS for better maintainability

### 2. Accessibility
**Status:** Enforced
- Select elements must have `aria-label` attributes
- Images must have `alt` attributes
- Form inputs should have associated labels
- ARIA attributes are validated

### 3. HTML Structure
**Status:** Enforced
- Tags must be lowercase
- Attributes must be lowercase
- IDs must be unique
- Tags must be properly closed

## VS Code Integration

If using VS Code, the `.vscode/settings.json` file will automatically:
- Enable HTML validation
- Show linting errors in the editor
- Provide code actions for common fixes
- Format HTML on save (if enabled)

## Customization

To adjust linting rules, edit the respective configuration files:
- `.htmlhintrc` - For HTMLHint rules
- `.htmlvalidate.json` - For html-validate rules
- `.vscode/settings.json` - For VS Code editor settings

## Notes

- Inline styles are allowed but discouraged for production code
- Accessibility rules are enforced to ensure WCAG compliance
- The configuration balances strictness with practical development needs

