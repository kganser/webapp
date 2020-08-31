exports.styles = {
  '.progress': {
    display: 'block',
    width: '100%',
    maxWidth: '500px',
    height: '8px',
    margin: '-20px 0 12px',
    webkitAppearance: 'none',
    mozAppearance: 'none',
    '&::-webkit-progress-bar, &::-moz-progress-bar': {
      background: 'white'
    },
    '&::-webkit-progress-value, &::-moz-progress-value': {
      background: '#0073b7'
    }
  }
};
exports.dependencies = ['field', 'icon', 'multiSelect'];
exports.component = ({React, components, jsx, url}) => {

  const request = (url, options) => new Promise((resolve, reject) => {
    const {data, method, onProgress} = options || {};
    const req = new XMLHttpRequest();
    req.open(method || 'GET', url);
    req.onload = e => resolve(e.target);
    req.onerror = e => reject(new Error(e.target.statusText || 'Unknown error'));
    req.upload.onprogress = onProgress;
    req.send(data);
  });

  return {
    field: ({endpoint, media}) => {
      const {field, icon, multiSelect} = components;

      // TODO: lazy-load image preview
      // TODO: generate ids for htmlFor props

      const optionsRef = React.useRef();
      const [loaded, setLoaded] = React.useState(false);
      const [files, setFiles] = React.useState(media || []);
      const [file, setFile] = React.useState();
      const [name, setName] = React.useState('');
      const [extension, setExtension] = React.useState('');
      const [progress, setProgress] = React.useState();
      const [error, setError] = React.useState();
      const uploading = progress != null;

      React.useEffect(() => setLoaded(true), []);

      return jsx([
        [multiSelect, {
          ref: optionsRef,
          name: 'media',
          options: files.map(({name, selected, type, value}) => ({
            label: [
              [icon, {type, image: value}],
              name
            ],
            selected,
            value
          }))
        }],
        file && uploading &&
          ['progress', {className: 'progress', value: progress}],
        error &&
          ['div', {className: 'message error'}, error],
        file &&
          [field, {label: 'File Name'},
            ['input', {
              autoFocus: true,
              disabled: uploading,
              value: name,
              onChange: e => {
                setName(e.target.value);
              }
            }]
          ],
        file &&
          ['button', {
            type: 'button',
            className: 'button danger',
            disabled: uploading,
            onClick: () => {
              setFile(null);
            }
          }, 'Clear'],
        !file &&
          ['label', {
            htmlFor: loaded ? 'file-js' : 'file',
            className: 'button'
          }, 'Choose New File'],
        (!loaded || file) &&
          ['label', {
            htmlFor: 'upload',
            className: 'button',
            disabled: uploading,
            onClick: e => {
              e.preventDefault();
              if (!name || /[\\\/]/.test(name)) {
                setError(name ? 'File name cannot contain slashes' : 'File name is required');
              } else {
                setError(null);
                setProgress(0);
                const label = name + extension;
                request(
                  url('/upload', {name: label})
                ).then(response => {
                  if (response.status != 200)
                    throw new Error(`Error fetching upload credentials: ${response.statusText}`);
                  const {key, accessId, policy, signature, type} = JSON.parse(response.responseText);
                  const data = new FormData();
                  data.set('key', key);
                  data.set('GoogleAccessId', accessId);
                  data.set('policy', policy);
                  data.set('signature', signature);
                  data.set('file', file, key);
                  return request(endpoint, {
                    method: 'post',
                    data,
                    onProgress: e => {
                      if (e.lengthComputable)
                        setProgress(e.loaded / e.total);
                    }
                  }).then(response => {
                    if (response.status >= 400) {
                      const xml = response.responseXML;
                      if (xml) xml = xml.getElementsByTagName('Message')[0];
                      throw new Error(xml && xml.textContent || 'Unable to upload file.');
                    }
                    setProgress(null);
                    setFile(null);
                    setFiles(files => [...files, {name: label, selected: true, type, value: key}]);
                    const elem = optionsRef.current;
                    if (elem) elem.scrollTop = elem.scrollHeight;
                  });
                }).catch(e => {
                  setError(e.message);
                  setProgress(null);
                });
              }
            }
          }, uploading ? 'Uploading...' : 'Upload'],
        // TODO: better workaround for nested form?
        ['input', {
          type: 'file',
          id: 'file-js',
          className: 'hidden',
          disabled: uploading,
          onChange: e => {
            const file = e.target.files[0];
            const [, name, extension] = (file && file.name || '').match(/([^\\\/]*?)(\.[a-z0-9]+)?$/i);
            setFile(file);
            setName(name);
            setExtension(extension);
          }
        }]
      ]);
    },
    form: ({endpoint, params}) => {
      return jsx(['form', {
        className: 'hidden',
        method: 'post',
        action: endpoint,
        encType: 'multipart/form-data'
      },
        ['input', {type: 'hidden', name: 'key', value: params.key}],
        ['input', {type: 'hidden', name: 'GoogleAccessId', value: params.accessId}],
        ['input', {type: 'hidden', name: 'policy', value: params.policy}],
        ['input', {type: 'hidden', name: 'signature', value: params.signature}],
        ['input', {type: 'hidden', name: 'success_action_redirect', value: params.redirect}],
        ['input', {type: 'file', name: 'file', id: 'file'}],
        ['button', {id: 'upload'}]
      ]);
    }
  };
}