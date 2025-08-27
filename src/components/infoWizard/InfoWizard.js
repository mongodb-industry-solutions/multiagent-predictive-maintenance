"use client";

import React from "react";
import Modal from "@leafygreen-ui/modal";
import { H3, Body } from "@leafygreen-ui/typography";
import Icon from "@leafygreen-ui/icon";
import PropTypes from "prop-types";
import Image from "next/image";
import Button from "@leafygreen-ui/button";
import { Tabs, Tab } from "@leafygreen-ui/tabs";
import { useInfoWizard } from "./hooks";

const InfoWizard = (props) => {
  const {
    open,
    setOpen,
    tooltipText,
    iconGlyph,
    sections,
    selected,
    setSelected,
  } = useInfoWizard(props);

  return (
    <>
      {/* Bigger button for navbars */}
      <Button
        style={{ margin: "5px" }}
        onClick={() => setOpen((prev) => !prev)}
        leftGlyph={<Icon glyph={iconGlyph} />}
      >
        Tell me more!
      </Button>

      <Modal open={open} setOpen={setOpen} size={"large"} className="z-2">
        <div className="overflow-y-auto h-[500px]">
          <Tabs
            aria-label="info wizard tabs"
            setSelected={setSelected}
            selected={selected}
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
                            )
                          )}
                        </ul>
                      ) : (
                        <Body>{section.body}</Body>
                      ))}

                    {section.image && (
                      <div className="relative w-full h-[400px] flex justify-center items-center">
                        <Image
                          src={section.image.src}
                          alt={section.image.alt}
                          fill
                          sizes="(max-width: 768px) 90vw, 700px"
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
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      heading: PropTypes.string.isRequired, // Tab title
      content: PropTypes.arrayOf(
        PropTypes.shape({
          heading: PropTypes.string,
          body: PropTypes.string,
          image: PropTypes.shape({
            src: PropTypes.string.isRequired,
            alt: PropTypes.string.isRequired,
            width: PropTypes.number,
          }),
        })
      ).isRequired,
    })
  ),
};

export default InfoWizard;
