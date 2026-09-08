"use client";

import React from "react";
import { Modal } from "@leafygreen-ui/modal";
import { H3, Body } from "@leafygreen-ui/typography";
import { Icon } from "@leafygreen-ui/icon";
import PropTypes from "prop-types";
import Image from "next/image";
import { Button } from "@leafygreen-ui/button";
import { IconButton } from "@leafygreen-ui/icon-button";
import { Tabs, Tab } from "@leafygreen-ui/tabs";
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
        <IconButton
          darkMode={darkMode}
          aria-label={tooltipText}
          title={tooltipText}
          onClick={() => setOpen((prev) => !prev)}
        >
          <Icon glyph={iconGlyph} />
        </IconButton>
      ) : (
        <Button
          style={{ margin: "5px" }}
          onClick={() => setOpen((prev) => !prev)}
          leftGlyph={<Icon glyph={iconGlyph} />}
        >
          {triggerText}
        </Button>
      )}

      <Modal
        open={open}
        setOpen={setOpen}
        size="large"
        style={{ width: "min(92vw, 1100px)", maxWidth: "1100px" }}
      >
        <div className="h-[72vh] min-h-[420px] max-h-[780px] overflow-y-auto pr-2">
          <Tabs
            aria-label="info wizard tabs"
            onValueChange={setSelected}
            value={selected}
          >
            {sections.map((tab, tabIndex) => (
              <Tab key={tabIndex} name={tab.heading}>
                {tab.content.map((section, sectionIndex) => (
                  <div key={sectionIndex} className="mb-4">
                    {section.heading && (
                      <H3 style={{ marginTop: "20px", marginBottom: "10px" }}>
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
              </Tab>
            ))}
          </Tabs>
        </div>
      </Modal>
    </>
  );
};

InfoWizard.propTypes = {
  open: PropTypes.bool.isRequired,
  setOpen: PropTypes.func.isRequired,
  tooltipText: PropTypes.string,
  iconGlyph: PropTypes.string,
  triggerText: PropTypes.string,
  iconOnly: PropTypes.bool,
  darkMode: PropTypes.bool,
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      heading: PropTypes.string.isRequired, // Tab title
      content: PropTypes.arrayOf(
        PropTypes.shape({
          heading: PropTypes.string,
          body: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
          image: PropTypes.shape({
            src: PropTypes.string.isRequired,
            alt: PropTypes.string.isRequired,
            width: PropTypes.number,
          }),
        }),
      ).isRequired,
    }),
  ),
};

export default InfoWizard;
