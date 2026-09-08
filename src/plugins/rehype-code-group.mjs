import { SKIP, visit } from "unist-util-visit";

const LANGUAGE_LABELS = {
	bash: "Bash",
	css: "CSS",
	html: "HTML",
	js: "JavaScript",
	jsx: "React JSX",
	json: "JSON",
	md: "Markdown",
	markdown: "Markdown",
	ps: "PowerShell",
	powershell: "PowerShell",
	sh: "Shell",
	shell: "Shell",
	ts: "TypeScript",
	tsx: "React TSX",
	yaml: "YAML",
	yml: "YAML",
};

function asArray(value) {
	if (Array.isArray(value)) return value;
	if (typeof value === "string") return value.split(/\s+/);
	return [];
}

function getCodeElement(pre) {
	return pre.children?.find(
		(child) => child.type === "element" && child.tagName === "code",
	);
}

function getCodeLabel(pre, labels, index) {
	if (labels[index]) return labels[index];

	const code = getCodeElement(pre);
	const title = code?.properties?.title || pre.properties?.title;
	if (typeof title === "string" && title.trim()) return title.trim();

	const language = asArray(code?.properties?.className)
		.find((className) => className.startsWith("language-"))
		?.slice("language-".length)
		.toLocaleLowerCase();

	return LANGUAGE_LABELS[language] || (language ? language.toUpperCase() : `代码 ${index + 1}`);
}

function classNames(...values) {
	return values.flatMap((value) => asArray(value)).filter(Boolean);
}

function element(tagName, properties, children) {
	return { type: "element", tagName, properties, children };
}

/**
 * Turns a remark-directive container into an accessible tabbed code group.
 * Markdown syntax:
 * :::code-group{labels="配置文件|页面样式"}
 * ```ts
 * // ...
 * ```
 * ```css
 * .card { color: var(--primary); }
 * ```
 * :::
 */
export function rehypeCodeGroup() {
	return (tree) => {
		let groupCount = 0;

		visit(tree, "element", (node) => {
			if (node.tagName !== "code-group") return;

			const elementChildren = node.children?.filter(
				(child) => child.type === "element",
			) || [];
			const codeBlocks = elementChildren.filter(
				(child) => child.tagName === "pre" && getCodeElement(child),
			);

			node.tagName = "div";
			node.properties = {
				...node.properties,
				className: classNames(node.properties?.className, "code-group"),
				dataCodeGroup: "true",
			};

			// Leave malformed or one-item groups as normal code content.
			if (codeBlocks.length < 2 || codeBlocks.length !== elementChildren.length) {
				return SKIP;
			}

			const labels = String(node.properties?.labels || node.properties?.titles || "")
				.split("|")
				.map((label) => label.trim());
			const groupId = `code-group-${groupCount++}`;
			const tabs = codeBlocks.map((pre, index) => {
				const tabId = `${groupId}-tab-${index}`;
				const panelId = `${groupId}-panel-${index}`;
				return element(
					"button",
					{
						type: "button",
						className: ["code-group-tab"],
						role: "tab",
						id: tabId,
						ariaControls: panelId,
						ariaSelected: index === 0 ? "true" : "false",
						tabIndex: index === 0 ? 0 : -1,
						dataCodeGroupTab: String(index),
					},
					[{ type: "text", value: getCodeLabel(pre, labels, index) }],
				);
			});

			const panels = codeBlocks.map((pre, index) =>
				element(
					"div",
					{
						className: ["code-group-panel"],
						role: "tabpanel",
						id: `${groupId}-panel-${index}`,
						ariaLabelledby: `${groupId}-tab-${index}`,
						dataCodeGroupPanel: String(index),
						hidden: index !== 0,
					},
					[pre],
				),
			);

			node.children = [
				element(
					"div",
					{
						className: ["code-group-tabs"],
						role: "tablist",
						ariaLabel: "代码版本切换",
					},
					tabs,
				),
				...panels,
			];

			return SKIP;
		});
	};
}
