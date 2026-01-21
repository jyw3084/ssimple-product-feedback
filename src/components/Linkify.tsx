import DOMPurify from 'dompurify';

export default function Linkify({ primaryColor, children }: { primaryColor: string, children: string }) {
	DOMPurify.addHook('afterSanitizeAttributes', function (node) {
		// set all elements owning target to target=_blank & rel="noopener"
		if ('target' in node) {
			node.setAttribute('target', '_blank');
			node.setAttribute('rel', 'noopener');
		}
	});

	const isUrl = (word: string) => {
		const urlPattern = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/gm;
		return word.match(urlPattern);
	}

	const withHttp = (url: string) => url.replace(/^(?:(.*:)?\/\/)?(.*)/i, (match, schemma, nonSchemmaUrl) => schemma ? match : `http://${nonSchemmaUrl}`);

	const addMarkup = (word: string) => {
		return isUrl(word) ? `<a href="${withHttp(word)}" target="_blank" class="transition-all hover:underline" style="color: ${primaryColor}">${word}</a>` : word;
	}

	if (children) {
		const words = children.split(' ');
		const formatedWords = words.map((w: string) => addMarkup(w));
		const html = DOMPurify.sanitize(formatedWords.join(' '));
		return (<p dangerouslySetInnerHTML={{ __html: html }} />);
	}
}