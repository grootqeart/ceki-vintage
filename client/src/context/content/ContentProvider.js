import React, { useState, useEffect, useContext } from 'react';
import ContentContext from './contentContext';
import useContentful from '../../hooks/useContentful';
import locaContext from '../localization/locaContext';
import localizedContent from './localizedContent.json';

// Local snapshot of the Contentful space (see /contentful export in the repo
// root). Used as the default content source so the app works without live
// Contentful credentials; a real space (if configured) still overrides it.
const getLocalStrings = (lang) =>
  localizedContent.strings[lang] || localizedContent.strings.en;
const getLocalStaticPages = (lang) =>
  localizedContent.staticPages[lang] || localizedContent.staticPages.en;

const ContentProvider = ({ children }) => {
  const { lang } = useContext(locaContext);
  const contentfulClient = useContentful();

  const [isLoading, setIsLoading] = useState(true);
  const [staticPages, setStaticPages] = useState(getLocalStaticPages(lang));
  const [localizedStrings, setLocalizedStrings] = useState(
    getLocalStrings(lang),
  );

  useEffect(() => {
    setIsLoading(true);

    setLocalizedStrings(getLocalStrings(lang));
    setStaticPages(getLocalStaticPages(lang));
    fetchContent();

    setIsLoading(false);
    // eslint-disable-next-line
  }, [lang]);

  const fetchContent = () => {
    contentfulClient
      .getEntries({ content_type: 'key', locale: lang })
      .then((res) => {
        let localizedStrings = {};

        res.items.forEach(
          (item) =>
            (localizedStrings[item.fields.keyName] =
              item.fields.value.fields.value),
        );

        setLocalizedStrings(localizedStrings);
      })
      .catch(() => {
        // No/invalid Contentful credentials — keep the local snapshot.
      });

    contentfulClient
      .getEntries({ content_type: 'staticPage', locale: lang })
      .then((res) => {
        setStaticPages(
          res.items.map((item) => ({
            slug: item.fields.slug,
            title: item.fields.title,
            content: item.fields.content.fields.value,
          })),
        );
      })
      .catch(() => {
        // No/invalid Contentful credentials — keep the local snapshot.
      });
  };

  const getLocalizedString = (key) =>
    localizedStrings && localizedStrings[key] ? localizedStrings[key] : key;

  return (
    <ContentContext.Provider
      value={{ isLoading, staticPages, getLocalizedString }}
    >
      {children}
    </ContentContext.Provider>
  );
};

export default ContentProvider;
