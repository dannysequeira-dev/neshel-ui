import { loader } from "fumadocs-core/source";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineDocs } from "fumadocs-mdx/macro";
import { z } from "zod";
import { i18n } from "./i18n";

const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: pageSchema.extend({
      /** Package whose exports this page documents (reference pages). */
      package: z.enum(["config", "layout", "typography", "components", "cli"]).optional(),
      /** Public exports documented on this page (export-to-docs coverage, research R6). */
      exports: z.array(z.string()).optional(),
    }),
    postprocess: { includeProcessedMarkdown: true },
  },
  meta: { schema: metaSchema },
});

export const source = loader({
  baseUrl: "/docs",
  i18n,
  source: docs.toFumadocsSource(),
});
