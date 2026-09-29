"use client";

import React from "react";
import Image from "next/image";
import {
  Body,
  Button,
  Content,
  Dialog,
  DialogRoot,
  H3,
  Header,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from "@via-ds/components";
import { Icon } from "@via-ds/icons";
import { useInfoWizard } from "./hooks";

const InfoWizard = (props) => {
  const {
    open,
    setOpen,
    tooltipText,
    iconGlyph,
    triggerText,
    iconOnly,
    darkMode,
    sections,
    selected,
    setSelected,
  } = useInfoWizard(props);

  return (
    <>
      {iconOnly ? (
        <Button
          aria-label={tooltipText}
          colorScheme={darkMode ? "dark" : undefined}
          onPress={() => setOpen((prev) => !prev)}
          variant="tertiary"
        >
          <Icon glyph={iconGlyph} />
        </Button>
      ) : (
        <Button
          style={{ margin: "5px" }}
          onPress={() => setOpen((prev) => !prev)}
        >
          <Icon glyph={iconGlyph} />
          {triggerText}
        </Button>
      )}

      <DialogRoot isOpen={open} onOpenChange={setOpen}>
        <Dialog
          size="large"
          style={{ width: "min(92vw, 1100px)", maxWidth: "1100px" }}
        >
          <Header>
            <Text slot="title">{tooltipText}</Text>
          </Header>
          <Content>
            <div className="h-[72vh] min-h-[420px] max-h-[780px] overflow-y-auto pr-2">
              <Tabs
                aria-label="info wizard tabs"
                selectedKey={String(selected)}
                onSelectionChange={(key) => setSelected(Number(key))}
              >
                <TabList>
                  {sections.map((tab, tabIndex) => (
                    <Tab key={String(tabIndex)}>{tab.heading}</Tab>
                  ))}
                </TabList>
                <TabPanels>
                  {sections.map((tab, tabIndex) => (
                    <TabPanel key={String(tabIndex)}>
                      {tab.content.map((section, sectionIndex) => (
                        <div key={sectionIndex} className="mb-4">
                          {section.heading && (
                            <H3
                              style={{ marginTop: "20px", marginBottom: "10px" }}
                            >
                              {section.heading}
                            </H3>
                          )}
                          {section.body &&
                            (Array.isArray(section.body) ? (
                              <ul className="list-disc pl-6">
                                {section.body.map((item, idx) =>
                                  typeof item == "object" ? (
                                    <li key={idx}>
                                      {item.heading}
                                      <ul className="list-disc pl-6">
                                        {item.body?.map((subItem, idx) => (
                                          <li key={idx}>
                                            <Body>{subItem}</Body>
                                          </li>
                                        ))}
                                      </ul>
                                    </li>
                                  ) : (
                                    <li key={idx}>
                                      <Body>{item}</Body>
                                    </li>
                                  ),
                                )}
                              </ul>
                            ) : (
                              <Body>{section.body}</Body>
                            ))}

                          {section.image && (
                            <div className="relative flex h-[55vh] min-h-[440px] max-h-[620px] w-full items-center justify-center">
                              <Image
                                src={section.image.src}
                                alt={section.image.alt}
                                fill
                                quality={100}
                                sizes="(max-width: 768px) 90vw, 1000px"
                                style={{
                                  objectFit: "contain",
                                  objectPosition: "center",
                                }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </TabPanel>
                  ))}
                </TabPanels>
              </Tabs>
            </div>
          </Content>
        </Dialog>
      </DialogRoot>
    </>
  );
};

export default InfoWizard;
