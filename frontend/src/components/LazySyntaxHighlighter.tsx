import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function LazySyntaxHighlighter(props: any) {
    return <SyntaxHighlighter {...props} style={oneDark} />;
}
