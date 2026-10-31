package com.sandipsky.inventory_system.features.accounting.account.dtos;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AccountMasterDTO {
    private int id;
    @JsonProperty("account_code")
    private String accountCode;
    @JsonProperty("account_name")
    private String accountName;
    @JsonProperty("account_type")
    private String accountType;
    @JsonProperty("is_active")
    private Boolean isActive = true;

    private Boolean deletable = true;

    @JsonProperty("is_system_generated")
    private Boolean isSystemGenerated = false;

    @JsonProperty("parent_account_name")
    private String parentAccountName;
    @JsonProperty("parent_id")
    private Integer parentId = 0;

    private String remarks;
}