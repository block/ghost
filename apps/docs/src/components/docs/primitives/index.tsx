"use client";

import { AccordionDemo } from "@/components/docs/primitives/accordion-demo";
import { AlertDemo } from "@/components/docs/primitives/alert-demo";
import { AlertDialogDemo } from "@/components/docs/primitives/alert-dialog-demo";
import { AspectRatioDemo } from "@/components/docs/primitives/aspect-ratio-demo";
import { AvatarDemo } from "@/components/docs/primitives/avatar-demo";
import { BadgeDemo } from "@/components/docs/primitives/badge-demo";
import { BreadcrumbDemo } from "@/components/docs/primitives/breadcrumb-demo";
import { ButtonDemo } from "@/components/docs/primitives/button-demo";
import { CalendarDemo } from "@/components/docs/primitives/calendar-demo";
import { CardDemo } from "@/components/docs/primitives/card-demo";
import { CarouselDemo } from "@/components/docs/primitives/carousel-demo";
import { ChartDemo } from "@/components/docs/primitives/chart-demo";
import { CheckboxDemo } from "@/components/docs/primitives/checkbox-demo";
import { CollapsibleDemo } from "@/components/docs/primitives/collapsible-demo";
import { ComboboxDemo } from "@/components/docs/primitives/combobox-demo";
import { CommandDemo } from "@/components/docs/primitives/command-demo";
import { ComponentWrapper } from "@/components/docs/primitives/component-wrapper";
import { ContextMenuDemo } from "@/components/docs/primitives/context-menu-demo";
import { DatePickerDemo } from "@/components/docs/primitives/date-picker-demo";
import { DialogDemo } from "@/components/docs/primitives/dialog-demo";
import { DrawerDemo } from "@/components/docs/primitives/drawer-demo";
import { DropdownMenuDemo } from "@/components/docs/primitives/dropdown-menu-demo";
import { FormDemo } from "@/components/docs/primitives/form-demo";
import { FormsDemo } from "@/components/docs/primitives/forms-demo";
import { HoverCardDemo } from "@/components/docs/primitives/hover-card-demo";
import { InputDemo } from "@/components/docs/primitives/input-demo";
import { InputOTPDemo } from "@/components/docs/primitives/input-otp-demo";
import { LabelDemo } from "@/components/docs/primitives/label-demo";
import { MenubarDemo } from "@/components/docs/primitives/menubar-demo";
import { NavigationMenuDemo } from "@/components/docs/primitives/navigation-menu-demo";
import { PaginationDemo } from "@/components/docs/primitives/pagination-demo";
import { PopoverDemo } from "@/components/docs/primitives/popover-demo";
import { ProgressDemo } from "@/components/docs/primitives/progress-demo";
import { RadioGroupDemo } from "@/components/docs/primitives/radio-group-demo";
import { ResizableDemo } from "@/components/docs/primitives/resizable-demo";
import { ScrollAreaDemo } from "@/components/docs/primitives/scroll-area-demo";
import { SelectDemo } from "@/components/docs/primitives/select-demo";
import { SeparatorDemo } from "@/components/docs/primitives/separator-demo";
import { SheetDemo } from "@/components/docs/primitives/sheet-demo";
import { SkeletonDemo } from "@/components/docs/primitives/skeleton-demo";
import { SliderDemo } from "@/components/docs/primitives/slider-demo";
import { SonnerDemo } from "@/components/docs/primitives/sonner-demo";
import { SwitchDemo } from "@/components/docs/primitives/switch-demo";
import { TableDemo } from "@/components/docs/primitives/table-demo";
import { TabsDemo } from "@/components/docs/primitives/tabs-demo";
import { TextareaDemo } from "@/components/docs/primitives/textarea-demo";
import { ToggleDemo } from "@/components/docs/primitives/toggle-demo";
import { ToggleGroupDemo } from "@/components/docs/primitives/toggle-group-demo";
import { TooltipDemo } from "@/components/docs/primitives/tooltip-demo";

export function ComponentDemos() {
  return (
    <div className="@container grid flex-1 gap-4 space-y-8 md:py-12">
      <ComponentWrapper name="accordion">
        <AccordionDemo />
      </ComponentWrapper>
      <ComponentWrapper name="alert">
        <AlertDemo />
      </ComponentWrapper>
      <ComponentWrapper name="alert-dialog">
        <AlertDialogDemo />
      </ComponentWrapper>
      <ComponentWrapper name="aspect-ratio">
        <AspectRatioDemo />
      </ComponentWrapper>
      <ComponentWrapper name="avatar">
        <AvatarDemo />
      </ComponentWrapper>
      <ComponentWrapper name="badge">
        <BadgeDemo />
      </ComponentWrapper>
      <ComponentWrapper name="breadcrumb">
        <BreadcrumbDemo />
      </ComponentWrapper>
      <ComponentWrapper name="button">
        <ButtonDemo />
      </ComponentWrapper>
      <ComponentWrapper name="calendar">
        <CalendarDemo />
      </ComponentWrapper>
      <ComponentWrapper name="card">
        <CardDemo />
      </ComponentWrapper>
      <ComponentWrapper name="carousel">
        <CarouselDemo />
      </ComponentWrapper>
      <ComponentWrapper name="chart" className="w-full">
        <ChartDemo />
      </ComponentWrapper>
      <ComponentWrapper name="checkbox">
        <CheckboxDemo />
      </ComponentWrapper>
      <ComponentWrapper name="collapsible">
        <CollapsibleDemo />
      </ComponentWrapper>
      <ComponentWrapper name="combobox">
        <ComboboxDemo />
      </ComponentWrapper>
      <ComponentWrapper name="command">
        <CommandDemo />
      </ComponentWrapper>
      <ComponentWrapper name="context-menu">
        <ContextMenuDemo />
      </ComponentWrapper>
      <ComponentWrapper name="date-picker">
        <DatePickerDemo />
      </ComponentWrapper>
      <ComponentWrapper name="dialog">
        <DialogDemo />
      </ComponentWrapper>
      <ComponentWrapper name="drawer">
        <DrawerDemo />
      </ComponentWrapper>
      <ComponentWrapper name="dropdown-menu">
        <DropdownMenuDemo />
      </ComponentWrapper>
      <ComponentWrapper name="form">
        <FormsDemo />
        <FormDemo />
      </ComponentWrapper>
      <ComponentWrapper name="hover-card">
        <HoverCardDemo />
      </ComponentWrapper>
      <ComponentWrapper name="input">
        <InputDemo />
      </ComponentWrapper>
      <ComponentWrapper name="input-otp">
        <InputOTPDemo />
      </ComponentWrapper>
      <ComponentWrapper name="label">
        <LabelDemo />
      </ComponentWrapper>
      <ComponentWrapper name="menubar">
        <MenubarDemo />
      </ComponentWrapper>
      <ComponentWrapper name="navigation-menu">
        <NavigationMenuDemo />
      </ComponentWrapper>
      <ComponentWrapper name="pagination">
        <PaginationDemo />
      </ComponentWrapper>
      <ComponentWrapper name="popover">
        <PopoverDemo />
      </ComponentWrapper>
      <ComponentWrapper name="progress">
        <ProgressDemo />
      </ComponentWrapper>
      <ComponentWrapper name="radio-group">
        <RadioGroupDemo />
      </ComponentWrapper>
      <ComponentWrapper name="resizable">
        <ResizableDemo />
      </ComponentWrapper>
      <ComponentWrapper name="scroll-area">
        <ScrollAreaDemo />
      </ComponentWrapper>
      <ComponentWrapper name="select">
        <SelectDemo />
      </ComponentWrapper>
      <ComponentWrapper name="separator">
        <SeparatorDemo />
      </ComponentWrapper>
      <ComponentWrapper name="sheet">
        <SheetDemo />
      </ComponentWrapper>
      <ComponentWrapper name="skeleton">
        <SkeletonDemo />
      </ComponentWrapper>
      <ComponentWrapper name="slider">
        <SliderDemo />
      </ComponentWrapper>
      <ComponentWrapper name="sonner">
        <SonnerDemo />
      </ComponentWrapper>
      <ComponentWrapper name="switch">
        <SwitchDemo />
      </ComponentWrapper>
      <ComponentWrapper name="table">
        <TableDemo />
      </ComponentWrapper>
      <ComponentWrapper name="tabs">
        <TabsDemo />
      </ComponentWrapper>
      <ComponentWrapper name="textarea">
        <TextareaDemo />
      </ComponentWrapper>
      <ComponentWrapper name="toggle">
        <ToggleDemo />
      </ComponentWrapper>
      <ComponentWrapper name="toggle-group">
        <ToggleGroupDemo />
      </ComponentWrapper>
      <ComponentWrapper name="tooltip">
        <TooltipDemo />
      </ComponentWrapper>
    </div>
  );
}
