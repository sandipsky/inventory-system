package com.sandipsky.inventory_system.features.settings.configuration.entities;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "configuration")
public class Configuration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @Column(nullable = false, unique = true)
    private String name;

    private String label;

    private String value;

    @JsonProperty("is_editable")
    @Column(name = "is_editable")
    private boolean isEditable = true;
}
