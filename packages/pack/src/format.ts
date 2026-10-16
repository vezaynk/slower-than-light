import formatXml from "xml-formatter";

/** Indent a serialized document. Every generated XML file uses this layout. */
export function prettyXml(xml: string): string {
  const formatted = formatXml(xml, {
    indentation: "  ",
    collapseContent: true,
    lineSeparator: "\n",
    whiteSpaceAtEndOfSelfclosingTag: false,
    forceSelfClosingEmptyTag: true,
  });
  return formatted.endsWith("\n") ? formatted : `${formatted}\n`;
}
