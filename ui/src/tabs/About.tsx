import ReactMarkdown from 'react-markdown';

export default function About() {

  const md = `# zkOTP: Zero-Knowledge dApp Boilerplate`;

  return (
    <ReactMarkdown children={md}/>
  );
}