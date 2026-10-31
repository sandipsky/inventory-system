package com.sandipsky.inventory_system.features.settings.document_numbering.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DocumentNumberingDTO {

    private int id;

    private String name;

    @JsonProperty("numbering_style")
    private String numberingStyle;

    private String prefix;

    @JsonProperty("body_length")
    private int bodyLength;

    @JsonProperty("start_no")
    private int startNo;

    @JsonProperty("end_no")
    private int endNo;
}
