package com.example.ragbackend.category;

import com.example.ragbackend.document.DocumentRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/categories")
public class CategoryApi {

    private final CategoryRepository categoryRepository;
    private final DocumentRepository documentRepository;

    public CategoryApi(CategoryRepository categoryRepository, DocumentRepository documentRepository) {
        this.categoryRepository = categoryRepository;
        this.documentRepository = documentRepository;
    }

    @GetMapping
    public List<CategoryDto> listCategories() {
        return categoryRepository.findAllByOrderByNameAsc().stream()
            .map(this::toDto)
            .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryDto createCategory(@Valid @RequestBody UpsertCategoryRequest request) {
        CategoryEntity category = new CategoryEntity();
        category.setName(request.name().trim());
        category.setDescription(request.description() == null ? "" : request.description().trim());
        return toDto(categoryRepository.save(category));
    }

    @PutMapping("/{id}")
    public CategoryDto updateCategory(@PathVariable UUID id, @Valid @RequestBody UpsertCategoryRequest request) {
        CategoryEntity category = categoryRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Categorie introuvable"));
        category.setName(request.name().trim());
        category.setDescription(request.description() == null ? "" : request.description().trim());
        return toDto(categoryRepository.save(category));
    }

    @DeleteMapping("/{id}")
    @Transactional
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(@PathVariable UUID id) {
        CategoryEntity category = categoryRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Categorie introuvable"));
        long linkedDocuments = documentRepository.countByCategoryIdAndStatusNot(id, "DELETED");

        if (linkedDocuments > 0) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Impossible de supprimer une categorie encore rattachee a des documents"
            );
        }

        categoryRepository.delete(category);
    }

    private CategoryDto toDto(CategoryEntity category) {
        long documentCount = documentRepository.countByCategoryIdAndStatusNot(category.getId(), "DELETED");
        return new CategoryDto(category.getId(), category.getName(), category.getDescription(), documentCount);
    }
}

record UpsertCategoryRequest(@NotBlank String name, String description) {
}

record CategoryDto(UUID id, String name, String description, long documentCount) {
}
