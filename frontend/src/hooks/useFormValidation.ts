// hooks/useFormValidation.ts
import { useState, useEffect } from 'react'

interface ValidationRules {
  [key: string]: {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    custom?: (value: any, formValues: any) => boolean
    errorMessage?: string
  }
}

interface ValidationErrors {
  [key: string]: string
}

/**
 * Custom hook for form validation
 * @param initialValues Initial form values
 * @param validationRules Rules for form validation
 * @param onValidationChange Optional callback when validation state changes
 */
function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: ValidationRules,
  onValidationChange?: (isValid: boolean, errors: ValidationErrors) => void
) {
  // Form values state
  const [values, setValues] = useState<T>(initialValues)
  
  // Validation errors state
  const [errors, setErrors] = useState<ValidationErrors>({})
  
  // Touched fields state (only validate touched fields until form submission)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  
  // Form validity state
  const [isValid, setIsValid] = useState<boolean>(false)
  
  // Track if form has been submitted
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false)

  // Validate all fields based on rules
  const validateForm = (formValues: T, touchedFields?: Record<string, boolean>): ValidationErrors => {
    const newErrors: ValidationErrors = {}
    
    // Only validate fields that have rules
    Object.keys(validationRules).forEach(field => {
      // Skip validation for untouched fields unless form is submitted
      if (!isSubmitted && touchedFields && !touchedFields[field]) {
        return
      }
      
      const rules = validationRules[field]
      const value = formValues[field]
      
      // Required field validation
      if (rules.required && (value === undefined || value === null || value === '')) {
        newErrors[field] = rules.errorMessage || 'This field is required'
        return
      }
      
      // Skip other validations if field is empty and not required
      if (value === undefined || value === null || value === '') {
        return
      }
      
      // Minimum length validation
      if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
        newErrors[field] = rules.errorMessage || `Minimum length is ${rules.minLength} characters`
        return
      }
      
      // Maximum length validation
      if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
        newErrors[field] = rules.errorMessage || `Maximum length is ${rules.maxLength} characters`
        return
      }
      
      // Pattern validation
      if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
        newErrors[field] = rules.errorMessage || 'Invalid format'
        return
      }
      
      // Custom validation
      if (rules.custom && !rules.custom(value, formValues)) {
        newErrors[field] = rules.errorMessage || 'Invalid value'
        return
      }
    })
    
    return newErrors
  }

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    // Handle checkboxes
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setValues(prev => ({ ...prev, [name]: checked }))
    } 
    // Handle number inputs
    else if (type === 'number') {
      const numberValue = value === '' ? '' : Number(value)
      setValues(prev => ({ ...prev, [name]: numberValue }))
    } 
    // Handle all other inputs
    else {
      setValues(prev => ({ ...prev, [name]: value }))
    }
    
    // Mark field as touched
    setTouched(prev => ({ ...prev, [name]: true }))
  }

  // Handle direct value update (useful for non-input elements)
  const setValue = (name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }))
    setTouched(prev => ({ ...prev, [name]: true }))
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent, onSubmit: (values: T) => void) => {
    e.preventDefault()
    
    // Mark form as submitted
    setIsSubmitted(true)
    
    // Mark all fields as touched
    const allTouched = Object.keys(validationRules).reduce((acc, field) => {
      acc[field] = true
      return acc
    }, {} as Record<string, boolean>)
    
    setTouched(allTouched)
    
    // Validate all fields
    const newErrors = validateForm(values)
    setErrors(newErrors)
    
    // If form is valid, call onSubmit callback
    if (Object.keys(newErrors).length === 0) {
      onSubmit(values)
    }
  }

  // Reset form to initial values
  const resetForm = (newInitialValues?: T) => {
    setValues(newInitialValues || initialValues)
    setErrors({})
    setTouched({})
    setIsSubmitted(false)
  }

  // Validate form on mount and when values or touched fields change
  useEffect(() => {
    const newErrors = validateForm(values, touched)
    setErrors(newErrors)
    
    // Form is valid if there are no errors
    const formValid = Object.keys(newErrors).length === 0
    setIsValid(formValid)
    
    // Call onValidationChange callback if provided
    if (onValidationChange) {
      onValidationChange(formValid, newErrors)
    }
  }, [values, touched, isSubmitted])

  return {
    values,
    errors,
    touched,
    isValid,
    handleChange,
    setValue,
    handleSubmit,
    resetForm
  }
}

export default useFormValidation