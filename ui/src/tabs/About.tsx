import ReactMarkdown from 'react-markdown';

export default function About() {

  const md = `# zkApp: Zero-Knowledge dApp Boilerplate`;

  return (
    <ReactMarkdown children={md}/>
  );
}