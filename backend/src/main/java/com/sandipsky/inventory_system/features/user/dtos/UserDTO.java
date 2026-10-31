package com.sandipsky.inventory_system.features.user.dtos;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class UserDTO {
    private int id;
    private String username;
    private String fullName;
    private String email;
    private String password;
    private String gender;
    private String contact;
    private String remarks;
    @JsonProperty("is_active")
    private boolean isActive;

    @JsonProperty("role_id")
    private Integer roleId;

    @JsonProperty("role_name")
    private String roleName;

    @JsonProperty("image_url")
    private String imageUrl;
}
