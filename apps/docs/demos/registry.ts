// Registry of live demos used by <Preview demo="…" />. Each entry's file is shown as the source.
// check:docs verifies that every <Preview> refers to an entry and every entry has its file.
import ComponentsAlertDialogBasic from "./components/alert-dialog-basic";
import ComponentsAppShellBasic from "./components/app-shell-basic";
import ComponentsBadgeVariants from "./components/badge-variants";
import ComponentsButtonSizes from "./components/button-sizes";
import ComponentsButtonVariants from "./components/button-variants";
import ComponentsCardBasic from "./components/card-basic";
import ComponentsComboboxAsync from "./components/combobox-async";
import ComponentsComboboxMultiple from "./components/combobox-multiple";
import ComponentsComboboxSingle from "./components/combobox-single";
import ComponentsDialogBasic from "./components/dialog-basic";
import ComponentsDialogControlled from "./components/dialog-controlled";
import ComponentsDropdownMenuCommands from "./components/dropdown-menu-commands";
import ComponentsInputStates from "./components/input-states";
import ComponentsLabelField from "./components/label-field";
import ComponentsMobileMenuBasic from "./components/mobile-menu-basic";
import ComponentsMultiSelectBasic from "./components/multi-select-basic";
import ComponentsNavbarResponsive from "./components/navbar-responsive";
import ComponentsNavigationMenuBasic from "./components/navigation-menu-basic";
import ComponentsPopoverBasic from "./components/popover-basic";
import ComponentsPopoverCombobox from "./components/popover-combobox";
import ComponentsSelectBasic from "./components/select-basic";
import ComponentsSelectControlled from "./components/select-controlled";
import ComponentsSeparatorBasic from "./components/separator-basic";
import ComponentsSheetSides from "./components/sheet-sides";
import ComponentsSidebarStatic from "./components/sidebar-static";
import ComponentsSkeletonLoading from "./components/skeleton-loading";
import ComponentsTooltipBasic from "./components/tooltip-basic";
import ComponentsVisuallyHiddenIcon from "./components/visually-hidden-icon";
import LayoutBoxDisplay from "./layout/box-display";
import LayoutCenterBasic from "./layout/center-basic";
import LayoutContainerSizes from "./layout/container-sizes";
import LayoutFlexDirection from "./layout/flex-direction";
import LayoutGridColumns from "./layout/grid-columns";
import LayoutInlineToolbar from "./layout/inline-toolbar";
import LayoutRecipeContentSidebar from "./layout/recipe-content-sidebar";
import LayoutRecipeDashboard from "./layout/recipe-dashboard";
import LayoutRecipeForm from "./layout/recipe-form";
import LayoutRecipeNavbar from "./layout/recipe-navbar";
import LayoutRecipeVerticalNav from "./layout/recipe-vertical-nav";
import LayoutStackBasic from "./layout/stack-basic";
import LayoutStackSeparator from "./layout/stack-separator";
import ThemingThemeScopes from "./theming/theme-scopes";
import TypographyCapsizeTrim from "./typography/capsize-trim";
import TypographyCaptionFigure from "./typography/caption-figure";
import TypographyHeadingScale from "./typography/heading-scale";
import TypographyParagraphMeasure from "./typography/paragraph-measure";
import TypographyTextInline from "./typography/text-inline";
import TypographyTypographyResponsive from "./typography/typography-responsive";

export const demos = {
  "components/alert-dialog-basic": ComponentsAlertDialogBasic,
  "components/app-shell-basic": ComponentsAppShellBasic,
  "components/badge-variants": ComponentsBadgeVariants,
  "components/button-sizes": ComponentsButtonSizes,
  "components/button-variants": ComponentsButtonVariants,
  "components/card-basic": ComponentsCardBasic,
  "components/combobox-async": ComponentsComboboxAsync,
  "components/combobox-multiple": ComponentsComboboxMultiple,
  "components/combobox-single": ComponentsComboboxSingle,
  "components/dialog-basic": ComponentsDialogBasic,
  "components/dialog-controlled": ComponentsDialogControlled,
  "components/dropdown-menu-commands": ComponentsDropdownMenuCommands,
  "components/input-states": ComponentsInputStates,
  "components/label-field": ComponentsLabelField,
  "components/mobile-menu-basic": ComponentsMobileMenuBasic,
  "components/multi-select-basic": ComponentsMultiSelectBasic,
  "components/navbar-responsive": ComponentsNavbarResponsive,
  "components/navigation-menu-basic": ComponentsNavigationMenuBasic,
  "components/popover-basic": ComponentsPopoverBasic,
  "components/popover-combobox": ComponentsPopoverCombobox,
  "components/select-basic": ComponentsSelectBasic,
  "components/select-controlled": ComponentsSelectControlled,
  "components/separator-basic": ComponentsSeparatorBasic,
  "components/sheet-sides": ComponentsSheetSides,
  "components/sidebar-static": ComponentsSidebarStatic,
  "components/skeleton-loading": ComponentsSkeletonLoading,
  "components/tooltip-basic": ComponentsTooltipBasic,
  "components/visually-hidden-icon": ComponentsVisuallyHiddenIcon,
  "layout/box-display": LayoutBoxDisplay,
  "layout/center-basic": LayoutCenterBasic,
  "layout/container-sizes": LayoutContainerSizes,
  "layout/flex-direction": LayoutFlexDirection,
  "layout/grid-columns": LayoutGridColumns,
  "layout/inline-toolbar": LayoutInlineToolbar,
  "layout/recipe-content-sidebar": LayoutRecipeContentSidebar,
  "layout/recipe-dashboard": LayoutRecipeDashboard,
  "layout/recipe-form": LayoutRecipeForm,
  "layout/recipe-navbar": LayoutRecipeNavbar,
  "layout/recipe-vertical-nav": LayoutRecipeVerticalNav,
  "layout/stack-basic": LayoutStackBasic,
  "layout/stack-separator": LayoutStackSeparator,
  "theming/theme-scopes": ThemingThemeScopes,
  "typography/capsize-trim": TypographyCapsizeTrim,
  "typography/caption-figure": TypographyCaptionFigure,
  "typography/heading-scale": TypographyHeadingScale,
  "typography/paragraph-measure": TypographyParagraphMeasure,
  "typography/text-inline": TypographyTextInline,
  "typography/typography-responsive": TypographyTypographyResponsive,
} as const;
