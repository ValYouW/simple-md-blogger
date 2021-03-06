(function(win) {
	var POSTS_CLASS = '.post-body';

	function parse(postsClass) {
		postsClass = (typeof postsClass === 'string' && postsClass) ? postsClass : POSTS_CLASS;
		var posts = document.querySelectorAll(postsClass);
		for (var i = 0; i < posts.length; ++i) {
			parseWithArray(posts[i]);
		}
	}

	/** NOTE: THIS METHOD IS NOT MAINTAINED ANYMORE **/
	function parseWithRegex(post) {
		var html = post.innerHTML;

		// Replace all titles (h1/h2/etc), regex explanation:
		// ^[\s]* - Line can start with spaces, we ignore those
		// ([#]+) - Match a sequence of #
		// (?:\s)* - After the hash we can have many spaces, we ignore those
		// (.*?)(?:<br>)?$ - Then match everything in non-greedy mode (as little as possible) until the end, line can end
		//                   with <br> so we ignore it
		html = html.replace(/^[\s]*([#]+)(?:\s)*(.*?)(?:<br>)?$/gm, function(match, hashes, title) {
			var headerLevel = hashes.length;
			return '<h' + headerLevel + '>' + title + '</h' + headerLevel + '>'
		});

		// Replace all code blocks, regex explanation:
		// ^``` - line should start with ```
		// ([a-zA-Z]+)? - Then optionally we could have a language (characters only)
		// ((?:.|\n)*?)``` - Then we match anything until ```, since '.' doesn't match \n we need (.|\n),
		//                   and we don't want that brackets in the match so adding ?:
		//                   and we want to match until first occurrence of ``` (non-greedy) so adding *?
		// (?:\<br>)?$ - Then we expect br tag or end-of-line
		html = html.replace(/^```([a-zA-Z]+)?((?:.|\n)*?)```(?:<br>)?$/gm, '<pre><code class="$1">$2</code></pre>');

		// Next replace code quotes, regex explanation:
		// Match anything between backticks, the character before the closing backtick should not be "\" (escaped backtick)
		html = html.replace(/`(.*?[^\\])`/g, '<code>$1</code>');

		// Next replace all escaped backticks (\`) with backticks
		html = html.replace(/\\`/g, '`');

		post.innerHTML = html;

		// Loop thru all the created code blocks and remove all <br>, also remove the first "\n"
		var codes = post.querySelectorAll('pre > code');
		for (var i = 0; i < codes.length; ++i) {
			var code = codes[i].innerHTML;
			code = code.replace(/<br>/g, '').replace(/^\n/, '');
			codes[i].innerHTML = code;
		}
	}

	function parseWithArray(post) {
		var brRegex = /<br>/g;
		var emptyLineRegex = /^[\s]*(?:<br>)?$/;

		// Line starting with ``` and an optional lang specified, can have optional <br>
		var beginCodeRegex = /^```([a-zA-Z]+)?(?:<br>)?/;
		// Line starts with ``` and nothing but spaces till the end
		var endCodeRegex = /^```[\s]*$/;
		// Escaped code is \``` and nothing till the end
		var escapedEndCodeRegex = /^\\```[\s]*$/;
		// Anything between backticks as long as the char before the closing backtick is not a "\" (escaped backtick)
		var codeQuoteRegex = /`(.*?[^\\])`/g;
		// Escaped backtick: \`
		var escapedCodeQuoteRegex = /\\`/g;

		// \[([^\]]+[^\\])] - Anything that is between brackets as long as it is not "]" and there is no "\" before the closing bracket (escaped bracket)
		// \((.*?)\) - Anything between round brackets
		// (?:{(.*?)})? - Optionally can have some text between curly brackets
		var linksRegex=/\[([^\]]+[^\\])]\((.*?)\)(?:{(.*?)})?/g;

		// Match any escaped brackets "\[" or "\]"
		var escapedLinksRegex = /\\(\[|])/g;

		// Line can start with spaces, then comes multiple "#", then can have spaces, then any text, and optional <br> before line ends
		var titleRegex = /^[\s]*([#]+)[\s]*(.*?)(?:<br>)?$/;

		var html = post.innerHTML;
		var lines = html.split('\n');
		var incode = false;
		for (var j = 0; j < lines.length; ++j) {
			var line = lines[j];
			if (line === null) {continue;} // See later that we put null in the array[j+1], skip those cells

			// Check if we are in code block
			if (incode) {
				// No <br> allowed in code blocks
				line = line.replace(brRegex, '');

				// Check if this is the end of the code block
				if (endCodeRegex.test(line)) {
					incode = false;
					line = '</code></pre>';
				} else {
					line = line.replace(escapedEndCodeRegex, '```');
				}
				lines[j] = line;
				continue;
			}

			/*  Not in code block */

			// Check if this is a beginning of code
			var m = line.match(beginCodeRegex);
			if (m) {
				incode = true;
				// The first line in a pre block must be on the same line of the pre block,
				// otherwise we will get an empty space (as pre render \n)
				lines[j] = '<pre><code class="' + (m[1] ? m[1] : '') + '">' + lines[j+1].replace(brRegex, '');
				lines[j+1] = null;
				continue;
			}

			/* This a regular line */

			// Replace titles (#)
			line = line.replace(titleRegex, function(match, hashes, title) {
				// If the line before a title is empty we remove it
				if (j > 0 && emptyLineRegex.test(lines[j-1])) {
					lines[j-1] = null;
				}

				var headerLevel = hashes.length;
				return '<h' + headerLevel + '>' + title + '</h' + headerLevel + '>'
			});

			// replace any inline code quotes `xxx`
			line = line.replace(codeQuoteRegex, '<code>$1</code>');

			// Next replace all escaped backtick (\`) with backtick
			line = line.replace(escapedCodeQuoteRegex, '`');

			// Next replace links
			line = line.replace(linksRegex, '<a href="$2" target="$3">$1</a>');

			// Next replace all escaped brackets \[\] with brackets
			line = line.replace(escapedLinksRegex, '$1');

			lines[j] = line;
		}
		post.innerHTML = lines.filter(function(l) {return l !== null;}).join('\n');
	}

	win.VYW = {
		parse: parse
	};

})(window);