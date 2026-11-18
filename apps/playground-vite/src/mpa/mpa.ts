// PT09 demo pages: the opt-in stylesheet (included by both documents) and the optional helper that adds
// effect/direction types and names the shared hero on both sides of a cross-document transition.
import "@neshel-ui/animations/page-transitions-mpa.css";
import "./mpa.css";
import {
  enableCrossDocumentTransitions,
  registerSharedElement,
} from "@neshel-ui/animations/page-transitions";

const hero = document.getElementById("mpa-hero");
if (hero) registerSharedElement(hero, "mpa-hero");
enableCrossDocumentTransitions({ effect: "slide" });
