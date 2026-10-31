package com.sandipsky.inventory_system.features.accounting.account.dtos;

import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AccountTypeGroupDTO {
    private String heading;
    private List<String> types;

    public AccountTypeGroupDTO() {
    }

    public AccountTypeGroupDTO(String heading, List<String> types) {
        this.heading = heading;
        this.types = types;
    }
}
