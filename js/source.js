// Source-specific configuration for Stefan Zweig Digital. A derivation for
// another edition replaces this file; the generic modules stay untouched.

export const source = {
  name: "Stefan Zweig Digital",
  defaultDocument: "data/o_szd.1222.tei.xml",

  /**
   * GAMS serves a IIIF Presentation manifest per SZD object. The TEI carries
   * the object id as idno[@type="objectId"] in the form o_szd.NNNN.
   * @param {Record<string, string>} idnos
   * @returns {string | null}
   */
  manifestFor(idnos) {
    const id = idnos.objectId;
    if (!id || !/^o_szd\.\d+$/.test(id)) return null;
    return `https://gams.uni-graz.at/${id.replace("_", ":")}/sdef:IIIF/getManifest`;
  },
};
