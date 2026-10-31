package com.sandipsky.inventory_system.features.settings.document_numbering.controllers;
import com.sandipsky.inventory_system.features.settings.document_numbering.services.DocumentNumberingService;
import com.sandipsky.inventory_system.features.settings.document_numbering.dtos.DocumentNumberingDTO;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.sandipsky.inventory_system.security.RequiresOperation;


@RestController
@RequestMapping("/documentNumbering")
public class DocumentNumberingController {

    @Autowired
    private DocumentNumberingService service;

    @GetMapping()
    @RequiresOperation("ViewDocumentNumbering")
    public List<DocumentNumberingDTO> getDocumentNumberings() {
        return service.getDocumentNumberings();
    }
}
