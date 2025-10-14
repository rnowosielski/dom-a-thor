import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DebugControls } from '../DebugControls'
import React from 'react'

describe('DebugControls', () => {
  const defaultProps = {
    width: 25,
    height: 30,
    houseDataUrl: 'test-image.jpg',
    onWidthChange: vi.fn(),
    onHeightChange: vi.fn(),
    onHouseDataUrlChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render all form elements', () => {
    render(<DebugControls {...defaultProps} />)
    
    expect(screen.getByLabelText(/width/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/height/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/upload image/i)).toBeInTheDocument()
  })

  it('should display current width and height values', () => {
    render(<DebugControls {...defaultProps} />)
    
    const widthInput = screen.getByLabelText(/width/i) as HTMLInputElement
    const heightInput = screen.getByLabelText(/height/i) as HTMLInputElement
    
    expect(widthInput.value).toBe('25')
    expect(heightInput.value).toBe('30')
  })

  it('should call onWidthChange when width input changes', () => {
    render(<DebugControls {...defaultProps} />)
    
    const widthInput = screen.getByLabelText(/width/i)
    
    fireEvent.change(widthInput, { target: { value: '50' } })
    
    expect(defaultProps.onWidthChange).toHaveBeenCalledWith(50)
  })

  it('should call onHeightChange when height input changes', () => {
    render(<DebugControls {...defaultProps} />)
    
    const heightInput = screen.getByLabelText(/height/i)
    
    fireEvent.change(heightInput, { target: { value: '60' } })
    
    expect(defaultProps.onHeightChange).toHaveBeenCalledWith(60)
  })

  it('should handle decimal input values', () => {
    render(<DebugControls {...defaultProps} />)
    
    const widthInput = screen.getByLabelText(/width/i)
    
    fireEvent.change(widthInput, { target: { value: '25.5' } })
    
    expect(defaultProps.onWidthChange).toHaveBeenCalledWith(25.5)
  })

  it('should handle negative input values', () => {
    render(<DebugControls {...defaultProps} />)
    
    const heightInput = screen.getByLabelText(/height/i)
    
    fireEvent.change(heightInput, { target: { value: '-10' } })
    
    expect(defaultProps.onHeightChange).toHaveBeenCalledWith(-10)
  })

  it('should handle zero input values', () => {
    render(<DebugControls {...defaultProps} />)
    
    const widthInput = screen.getByLabelText(/width/i)
    
    fireEvent.change(widthInput, { target: { value: '0' } })
    
    expect(defaultProps.onWidthChange).toHaveBeenCalledWith(0)
  })

  it('should handle file upload and convert to base64', async () => {
    const user = userEvent.setup()
    
    // Mock FileReader
    const mockFileReader = {
      readAsDataURL: vi.fn(),
      onload: null,
      result: 'data:image/jpeg;base64,test-image-data',
    }
    
    Object.defineProperty(window, 'FileReader', {
      value: vi.fn(() => mockFileReader),
      writable: true,
    })
    
    render(<DebugControls {...defaultProps} />)
    
    const fileInput = screen.getByLabelText(/upload image/i)
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    
    await user.upload(fileInput, file)
    
    expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(file)
    
    // Simulate FileReader onload event
    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test-image-data' } } as any)
    }
    
    expect(defaultProps.onHouseDataUrlChange).toHaveBeenCalledWith('data:image/jpeg;base64,test-image-data')
  })

  it('should handle file upload with different file types', async () => {
    const user = userEvent.setup()
    
    // Mock FileReader
    const mockFileReader = {
      readAsDataURL: vi.fn(),
      onload: null,
      result: 'data:image/png;base64,png-data',
    }
    
    Object.defineProperty(window, 'FileReader', {
      value: vi.fn(() => mockFileReader),
      writable: true,
    })
    
    render(<DebugControls {...defaultProps} />)
    
    const fileInput = screen.getByLabelText(/upload image/i)
    const file = new File(['test'], 'test.png', { type: 'image/png' })
    
    await user.upload(fileInput, file)
    
    expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(file)
    
    // Simulate FileReader onload event
    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: 'data:image/png;base64,png-data' } } as any)
    }
    
    expect(defaultProps.onHouseDataUrlChange).toHaveBeenCalledWith('data:image/png;base64,png-data')
  })

  it('should handle no file selection', async () => {
    const user = userEvent.setup()
    render(<DebugControls {...defaultProps} />)
    
    const fileInput = screen.getByLabelText(/upload image/i)
    
    // Clear the file input (simulating no file selection)
    fireEvent.change(fileInput, { target: { files: [] } })
    
    expect(defaultProps.onHouseDataUrlChange).not.toHaveBeenCalled()
  })


  it('should handle large input values', () => {
    render(<DebugControls {...defaultProps} />)
    
    const widthInput = screen.getByLabelText(/width/i)
    
    fireEvent.change(widthInput, { target: { value: '999999' } })
    
    expect(defaultProps.onWidthChange).toHaveBeenCalledWith(999999)
  })

  it('should handle input with only spaces', () => {
    render(<DebugControls {...defaultProps} />)
    
    const heightInput = screen.getByLabelText(/height/i)
    
    fireEvent.change(heightInput, { target: { value: '   ' } })
    
    expect(defaultProps.onHeightChange).toHaveBeenCalledWith(0)
  })


})
