import { TestBed } from '@angular/core/testing';
import { BookCoverComponent } from './book-cover.component';

describe('BookCoverComponent', () => {
  function render(src: string) {
    const fixture = TestBed.createComponent(BookCoverComponent);
    fixture.componentRef.setInput('src', src);
    fixture.componentRef.setInput('title', 'Book title');
    fixture.detectChanges();
    return fixture;
  }

  it('renders an absent cover as a fallback without an image request', () => {
    const fixture = render('');
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('img')).toBeNull();
    expect(element.textContent).toContain('No cover available');
  });

  it('resets failed image state when an existing cover component receives a new URL', () => {
    const firstUrl = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"/>')}`;
    const secondUrl = `${firstUrl}#second`;
    const fixture = render(firstUrl);
    const element: HTMLElement = fixture.nativeElement;
    element.querySelector('img')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(element.querySelector('img')).toBeNull();
    fixture.componentRef.setInput('src', secondUrl);
    fixture.detectChanges();
    expect(element.querySelector('img')?.getAttribute('src')).toBe(secondUrl);
    expect(element.querySelector('img')?.alt).toBe('Book title');
    expect(element.textContent).not.toContain('No cover available');
  });
});
